"""
Real-time EDR monitor for new .exe files in Downloads / Desktop.
Persists every scan to SQLite (`scans` table), prints clean English CLI output,
and raises win10toast alerts on high-risk detections.

Run from the backend folder:
    python monitor.py
"""

from __future__ import annotations

import os
import struct
import sys
import threading
import time
import traceback
import winsound
from pathlib import Path
from typing import Dict, List, Optional, Set

# Ensure backend root is importable when run as a script
BACKEND_ROOT = Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))
os.chdir(BACKEND_ROOT)

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

from app.database import SCAN_LOG_TABLE, get_db_path, init_db, insert_scan_log
from app.file_analyzer import analyze_file
from app.prediction_service import PredictionService

MODEL_PATH = BACKEND_ROOT / "models" / "random_forest_model.pkl"
ICON_PATH = BACKEND_ROOT / "assets" / "ransomguard.ico"
# Must match frontend default user (Scan Logs filters by username)
MONITOR_USERNAME = "Guest"
SCAN_SOURCE = "realtime_monitor"
RISK_ALERT_THRESHOLD = 50
EXE_SUFFIX = ".exe"
SKIP_SUFFIXES = (".tmp", ".part", ".crdownload", ".partial", ".download")
SETTLE_CHECKS = 4
SETTLE_INTERVAL_SEC = 0.5
SETTLE_TIMEOUT_SEC = 120
CLI_WIDTH = 72
ALERT_TITLE = "[RansomGuard EDR - Threat Detected]"

_processed_lock = threading.Lock()
_processed_paths: Set[str] = set()
_db_lock = threading.Lock()


# ---------------------------------------------------------------------------
# CLI helpers (ASCII-only terminal output)
# ---------------------------------------------------------------------------

def _cli(text: str) -> str:
    """Normalize text for Windows terminals (ASCII-safe, readable)."""
    if not text:
        return ""
    replacements = {
        "\u2014": "-",
        "\u2013": "-",
        "\u2026": "...",
        "\U0001f6a8": "[!]",
        "\u26a0": "[*]",
        "\u2713": "[+]",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text.encode("ascii", errors="replace").decode("ascii").strip()


def _log(level: str, message: str) -> None:
    print(f"[{level:>7}] {_cli(message)}")


def _log_error(context: str, exc: BaseException) -> None:
    _log("ERROR", f"{context}: {exc}")
    for line in traceback.format_exc().strip().splitlines():
        _log("TRACE", line)


def _format_size(num_bytes: int) -> str:
    if num_bytes < 1024:
        return f"{num_bytes} B"
    if num_bytes < 1024 ** 2:
        return f"{num_bytes / 1024:.1f} KB"
    if num_bytes < 1024 ** 3:
        return f"{num_bytes / 1024 ** 2:.1f} MB"
    return f"{num_bytes / 1024 ** 3:.2f} GB"


def _risk_status(risk_score: int, label: str) -> str:
    if risk_score > RISK_ALERT_THRESHOLD or label == "Ransomware":
        return "THREAT"
    if risk_score >= 35 or label == "Suspicious":
        return "SUSPICIOUS"
    return "CLEAR"


def _box_line(content: str = "") -> str:
    inner = _cli(content)[: CLI_WIDTH - 4]
    return f"| {inner:<{CLI_WIDTH - 4}} |"


def _box_border(char: str = "-") -> str:
    return "+" + char * (CLI_WIDTH - 2) + "+"


# ---------------------------------------------------------------------------
# Custom toast icon (stdlib-only minimal .ico)
# ---------------------------------------------------------------------------

def _write_minimal_alert_icon(path: Path) -> None:
    """Write a small red 16x16 icon without external dependencies."""
    width, height = 16, 16
    row_bytes = width * 4
    and_row = ((width + 31) // 32) * 4
    xor_rows = b""
    for _ in range(height):
        row = b""
        for _ in range(width):
            row += b"\x30\x10\xD0\xFF"  # BGRA reddish
        xor_rows += row
    and_mask = b"\x00" * (and_row * height)
    bmp = struct.pack("<IIIHHIIIIII", 40, width, height * 2, 1, 32, 0, 0, 0, 0, 0, 0)
    bmp += xor_rows + and_mask
    bmp_size = len(bmp)
    offset = 6 + 16
    ico = struct.pack("<HHH", 0, 1, 1)
    ico += struct.pack("<BBBBHHII", width, height, 0, 0, 1, 32, bmp_size, offset)
    ico += bmp
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(ico)


def ensure_alert_icon() -> Optional[str]:
    try:
        if not ICON_PATH.is_file():
            _write_minimal_alert_icon(ICON_PATH)
        resolved = str(ICON_PATH.resolve())
        if os.path.isfile(resolved):
            return resolved
    except Exception as exc:
        _log_error("Custom icon setup", exc)
    return None


# ---------------------------------------------------------------------------
# Database (`scans` table = Scan Logs in UI)
# ---------------------------------------------------------------------------

def prepare_scan_record(result: Dict, file_path: str) -> Dict:
    """Map analyzer output to the schema expected by insert_scan_log()."""
    record = dict(result)
    record["filePath"] = file_path
    record["scanSource"] = SCAN_SOURCE

    chains = result.get("apiChains") or {}
    yara = result.get("yaraMatches") or {}
    record.setdefault("chainScore", chains.get("totalScore", 0))
    record.setdefault("yaraTotalScore", yara.get("totalScore", 0))
    record.setdefault("benignCount", result.get("benignCount", 0))
    record.setdefault("ransomwareCount", result.get("ransomwareCount", 0))
    record.setdefault("totalRows", 1)
    record.setdefault("totalFeatures", 0)

    return record


def persist_scan(result: Dict, file_path: str) -> Optional[int]:
    """Insert into `scans` immediately after analysis."""
    try:
        if "error" in result:
            record = {
                "filename": result.get("filename", os.path.basename(file_path)),
                "overallLabel": "Error",
                "overallConfidence": 0,
                "riskScore": 0,
                "detectionReasons": [result["error"]],
                "verdictReasonEn": f"Scan failed: {result['error']}",
                "verdictReasonAr": "",
                "benignCount": 0,
                "ransomwareCount": 0,
                "totalRows": 0,
                "totalFeatures": 0,
                "time": time.strftime("%Y-%m-%d %H:%M:%S"),
            }
        else:
            record = prepare_scan_record(result, file_path)

        with _db_lock:
            row_id = insert_scan_log(
                record,
                file_path=file_path,
                username=MONITOR_USERNAME,
                scan_source=SCAN_SOURCE,
            )

        _log(
            "DB",
            (
                f"Saved -> {get_db_path()} | table={SCAN_LOG_TABLE} | id={row_id} | "
                f"user={MONITOR_USERNAME} | file={record.get('filename')} | "
                f"risk={record.get('riskScore', 0)}"
            ),
        )
        return row_id
    except Exception as exc:
        _log_error("Database insert (scans table)", exc)
        return None


# ---------------------------------------------------------------------------
# Notifications (win10toast + critical system sound)
# ---------------------------------------------------------------------------

def _play_critical_alert_sound() -> None:
    """Windows critical stop sound (System Hand / error alert)."""
    winsound.MessageBeep(winsound.MB_ICONHAND)


def show_security_alert(filename: str, file_path: str, risk_score: int, label: str) -> None:
    """win10toast popup with custom icon; non-blocking via custom thread with threaded=False."""
    try:
        _play_critical_alert_sound()
    except Exception as exc:
        _log_error("Critical alert sound", exc)

    def run_toast() -> None:
        try:
            from win10toast import ToastNotifier

            icon_path = ensure_alert_icon()
            message = (
                f"Risk Score: {risk_score}/100\n"
                f"Verdict: {label}\n"
                f"File: {filename}\n"
                f"Suspicious executable detected by RansomGuard EDR."
            )

            toaster = ToastNotifier()
            shown = toaster.show_toast(
                title=ALERT_TITLE,
                msg=message,
                icon_path=icon_path,
                duration=15,
                threaded=False,  # Set to False to bypass the buggy internal win10toast thread causing TypeError: WPARAM
            )
            if shown is False:
                _log("WARN", "win10toast returned False (notifications may be disabled in Windows).")
            else:
                _log("OK", f"Toast completed via win10toast | icon={icon_path or 'default'}")
        except Exception as exc:
            _log_error("Windows toast (win10toast)", exc)

    try:
        # Run the toast in a separate native Python thread to prevent blocking the main script execution
        # and to handle exceptions safely.
        toast_thread = threading.Thread(
            target=run_toast,
            name=f"toast-{filename}",
            daemon=True
        )
        toast_thread.start()
        _log("OK", f"Toast thread started asynchronously | file={filename}")
    except Exception as exc:
        _log_error("Starting toast thread", exc)


# ---------------------------------------------------------------------------
# Scan pipeline
# ---------------------------------------------------------------------------

def load_model():
    """Load ML model if present (optional for static .exe analysis)."""
    if not MODEL_PATH.is_file():
        _log("WARN", f"Model not found at {MODEL_PATH} (static analysis only).")
        return None
    try:
        service = PredictionService(str(MODEL_PATH))
        _log("OK", f"Model loaded: {MODEL_PATH.name}")
        return service.model
    except Exception as exc:
        _log_error("Model load", exc)
        return None


def resolve_watch_directories() -> List[Path]:
    """Downloads and Desktop (including OneDrive localized paths)."""
    home = Path.home()
    one_drive = Path(os.environ.get("OneDrive", home / "OneDrive"))

    candidates = [
        home / "Downloads",
        one_drive / "Downloads",
        home / "Desktop",
        one_drive / "Desktop",
        one_drive / "\u0633\u0637\u062d \u0627\u0644\u0645\u0643\u062a\u0628",
        home / "OneDrive" / "Desktop",
        home / "OneDrive" / "\u0633\u0637\u062d \u0627\u0644\u0645\u0643\u0628",
    ]

    seen: Set[Path] = set()
    dirs: List[Path] = []
    for path in candidates:
        try:
            resolved = path.resolve()
        except OSError:
            continue
        if resolved.is_dir() and resolved not in seen:
            seen.add(resolved)
            dirs.append(resolved)

    if not dirs:
        fallback = home / "Downloads"
        _log("WARN", f"No standard folders found; using {fallback}")
        dirs.append(fallback)

    return dirs


def is_executable_candidate(path: str) -> bool:
    name = os.path.basename(path).lower()
    if not name.endswith(EXE_SUFFIX):
        return False
    if name.startswith("~$"):
        return False
    return not any(name.endswith(suffix) for suffix in SKIP_SUFFIXES)


def wait_until_file_ready(file_path: str) -> bool:
    """Wait until download/copy finishes (stable non-zero size)."""
    deadline = time.time() + SETTLE_TIMEOUT_SEC
    last_size = -1
    stable = 0

    while time.time() < deadline:
        if not os.path.isfile(file_path):
            time.sleep(SETTLE_INTERVAL_SEC)
            continue
        try:
            size = os.path.getsize(file_path)
        except OSError:
            time.sleep(SETTLE_INTERVAL_SEC)
            continue

        if size > 0 and size == last_size:
            stable += 1
            if stable >= SETTLE_CHECKS:
                return True
        else:
            stable = 0
            last_size = size

        time.sleep(SETTLE_INTERVAL_SEC)

    return os.path.isfile(file_path) and os.path.getsize(file_path) > 0


def claim_path(file_path: str) -> bool:
    """Avoid scanning the same file twice."""
    normalized = os.path.normcase(os.path.abspath(file_path))
    with _processed_lock:
        if normalized in _processed_paths:
            return False
        _processed_paths.add(normalized)
    return True


def print_scan_result(result: Dict) -> None:
    """Print a structured English-only scan report to the terminal."""
    if "error" in result:
        print()
        print(_box_border())
        print(_box_line("SCAN FAILED"))
        print(_box_border("="))
        print(_box_line(f"File  : {result.get('filename', 'unknown')}"))
        print(_box_line(f"Path  : {result.get('_monitored_path', '-')}"))
        print(_box_line(f"Error : {result['error']}"))
        print(_box_border())
        print()
        return

    filename = result.get("filename", "unknown")
    file_path = result.get("_monitored_path", "-")
    label = result.get("overallLabel", "Unknown")
    risk_score = int(result.get("riskScore") or 0)
    confidence = result.get("overallConfidence", "-")
    file_size = int(result.get("fileSize") or 0)
    file_type = result.get("fileType", "-")
    scanned_at = result.get("time", "-")
    db_saved = result.get("_db_saved", False)
    db_id = result.get("_db_row_id", "-")
    status = _risk_status(risk_score, label)
    verdict = _cli(result.get("verdictReasonEn") or "No verdict available.")

    layers = result.get("layerBreakdown") or {}
    sig_match = result.get("signatureMatch", False)
    sig_family = result.get("signatureFamily") or "-"
    entropy = result.get("entropy", "-")

    reasons_raw = result.get("detectionReasons") or []
    reasons = [_cli(r) for r in reasons_raw if _cli(r)]

    print()
    print(_box_border("="))
    print(_box_line("RANSOMGUARD SCAN REPORT"))
    print(_box_border("="))
    print(_box_line(f"Status     : {status}"))
    print(_box_line(f"File       : {filename}"))
    print(_box_line(f"Path       : {file_path}"))
    print(_box_line(f"Type       : {file_type}"))
    print(_box_line(f"Size       : {_format_size(file_size)}"))
    print(_box_line(f"Scanned    : {scanned_at}"))
    print(_box_line(f"Database   : {'Saved' if db_saved else 'FAILED'} (id={db_id})"))
    print(_box_border())
    print(_box_line("CLASSIFICATION"))
    print(_box_border())
    print(_box_line(f"Label      : {label}"))
    print(_box_line(f"Risk Score : {risk_score}/100"))
    print(_box_line(f"Confidence : {confidence}"))
    print(_box_border())
    print(_box_line("LAYER SCORES"))
    print(_box_border())
    print(_box_line(f"Signatures : {layers.get('signatures', 0)}"))
    print(_box_line(f"Entropy    : {layers.get('entropy', 0)}  (value: {entropy})"))
    print(_box_line(f"PE Struct  : {layers.get('peStructure', 0)}"))
    print(_box_line(f"Behavior   : {layers.get('behavior', 0)}"))
    print(_box_border())
    print(_box_line("SIGNATURES"))
    print(_box_border())
    print(_box_line(f"Matched    : {'Yes' if sig_match else 'No'}"))
    print(_box_line(f"Family     : {sig_family}"))
    print(_box_border())
    print(_box_line("VERDICT"))
    print(_box_border())

    words = verdict.split()
    line, wrapped = [], []
    for word in words:
        if sum(len(w) for w in line) + len(line) + len(word) > CLI_WIDTH - 6:
            wrapped.append(" ".join(line))
            line = [word]
        else:
            line.append(word)
    if line:
        wrapped.append(" ".join(line))
    for i, chunk in enumerate(wrapped or ["(none)"]):
        prefix = "Verdict    : " if i == 0 else "           "
        print(_box_line(f"{prefix}{chunk}"))

    if reasons:
        print(_box_border())
        print(_box_line("DETECTION REASONS"))
        print(_box_border())
        for idx, reason in enumerate(reasons, start=1):
            print(_box_line(f"{idx:>2}. {reason}"))

    print(_box_border("="))
    if risk_score > RISK_ALERT_THRESHOLD:
        print(_box_line("ACTION: High risk - win10toast alert dispatched."))
    else:
        print(_box_line("ACTION: No alert required."))
    print(_box_border("="))
    print()


def scan_executable(file_path: str, model) -> None:
    if not wait_until_file_ready(file_path):
        _log("SKIP", f"File not ready or empty: {file_path}")
        return

    filename = os.path.basename(file_path)
    _log("SCAN", f"Analyzing {filename}")

    try:
        result = analyze_file(file_path, filename, model)
    except Exception as exc:
        _log_error("File analysis", exc)
        result = {
            "error": str(exc),
            "filename": filename,
            "riskScore": 0,
            "overallLabel": "Error",
        }

    result["_monitored_path"] = file_path
    row_id = persist_scan(result, file_path)
    result["_db_saved"] = row_id is not None
    result["_db_row_id"] = row_id if row_id is not None else "-"
    print_scan_result(result)

    if "error" in result:
        return

    risk_score = int(result.get("riskScore") or 0)
    label = result.get("overallLabel", "Unknown")
    if risk_score > RISK_ALERT_THRESHOLD:
        try:
            show_security_alert(filename, file_path, risk_score, label)
            _log("ALERT", f"Risk threshold exceeded ({risk_score} > {RISK_ALERT_THRESHOLD}).")
        except Exception as exc:
            _log_error("Security alert pipeline", exc)


class ExeFileEventHandler(FileSystemEventHandler):
    def __init__(self, model) -> None:
        super().__init__()
        self._model = model

    def on_created(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._schedule_scan(event.src_path)

    def on_moved(self, event: FileSystemEvent) -> None:
        if not event.is_directory and getattr(event, "dest_path", None):
            self._schedule_scan(event.dest_path)

    def _schedule_scan(self, path: str) -> None:
        if not is_executable_candidate(path):
            return
        if not claim_path(path):
            return
        thread = threading.Thread(
            target=scan_executable,
            args=(path, self._model),
            daemon=True,
            name=f"scan-{os.path.basename(path)}",
        )
        thread.start()


def main() -> None:
    print()
    print(_box_border("="))
    print(_box_line("RANSOMGUARD REAL-TIME EDR MONITOR"))
    print(_box_border("="))
    print(_box_line(f"Backend  : {BACKEND_ROOT}"))
    print(_box_line(f"Database : {get_db_path()}"))
    print(_box_line(f"Table    : {SCAN_LOG_TABLE} (Scan Logs UI)"))
    print(_box_line(f"User     : {MONITOR_USERNAME}"))
    print(_box_line(f"Trigger  : New {EXE_SUFFIX} in watched folders"))
    print(_box_line(f"Alert    : Risk score > {RISK_ALERT_THRESHOLD}"))
    print(_box_line("Notify   : win10toast (threaded)"))
    print(_box_border("="))
    print()

    try:
        init_db()
        _log("OK", f"Database ready | {get_db_path()}")
    except Exception as exc:
        _log_error("Database init", exc)

    try:
        ensure_alert_icon()
        _log("OK", f"Alert icon: {ICON_PATH if ICON_PATH.is_file() else 'unavailable'}")
    except Exception as exc:
        _log_error("Alert icon init", exc)

    model = load_model()
    watch_dirs = resolve_watch_directories()

    print(_box_border())
    print(_box_line("WATCHED DIRECTORIES"))
    print(_box_border())
    for folder in watch_dirs:
        print(_box_line(str(folder)))
    print(_box_border())
    print()

    handler = ExeFileEventHandler(model)
    observer = Observer()
    for folder in watch_dirs:
        observer.schedule(handler, str(folder), recursive=False)

    observer.start()
    _log("RUNNING", "Waiting for new .exe files... (Ctrl+C to stop)")
    print()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print()
        _log("STOP", "Shutting down monitor.")
    finally:
        observer.stop()
        observer.join()


if __name__ == "__main__":
    main()
