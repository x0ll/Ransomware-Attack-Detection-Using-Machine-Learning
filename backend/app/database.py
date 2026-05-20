import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ransomguard.db'))

# UI "Scan Logs" page reads from table `scans` (SQLite file: ransomguard.db)
SCAN_LOG_TABLE = "scans"


def get_db_path() -> str:
    return DB_PATH


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    # Create scans table if it doesn't exist
    conn.execute('''
        CREATE TABLE IF NOT EXISTS scans (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            filename    TEXT NOT NULL,
            time        TEXT NOT NULL,
            total_rows  INTEGER,
            total_features INTEGER,
            benign_count   INTEGER,
            ransomware_count INTEGER,
            overall_label  TEXT,
            overall_confidence REAL,
            accuracy    REAL,
            precision   REAL,
            recall      REAL,
            f1          REAL,
            username    TEXT,
            risk_score  INTEGER DEFAULT 0,
            entropy     REAL DEFAULT 0,
            entropy_header REAL DEFAULT 0,
            entropy_middle REAL DEFAULT 0,
            entropy_tail   REAL DEFAULT 0,
            signature_match INTEGER DEFAULT 0,
            signature_family TEXT DEFAULT NULL,
            file_size   INTEGER DEFAULT 0,
            file_type   TEXT DEFAULT NULL,
            layer_signatures INTEGER DEFAULT 0,
            layer_entropy    INTEGER DEFAULT 0,
            layer_pe         INTEGER DEFAULT 0,
            layer_behavior   INTEGER DEFAULT 0,
            yara_matched_count INTEGER DEFAULT 0,
            yara_total_score   INTEGER DEFAULT 0,
            chain_count        INTEGER DEFAULT 0,
            chain_score        INTEGER DEFAULT 0,
            detection_reasons  TEXT DEFAULT NULL,
            verdict_reason_en  TEXT DEFAULT NULL,
            verdict_reason_ar  TEXT DEFAULT NULL
        )
    ''')

    # Add columns if they don't already exist (for older databases)
    new_cols = [
        ('username',          'TEXT DEFAULT NULL'),
        ('risk_score',        'INTEGER DEFAULT 0'),
        ('entropy',           'REAL DEFAULT 0'),
        ('entropy_header',    'REAL DEFAULT 0'),
        ('entropy_middle',    'REAL DEFAULT 0'),
        ('entropy_tail',      'REAL DEFAULT 0'),
        ('signature_match',   'INTEGER DEFAULT 0'),
        ('signature_family',  'TEXT DEFAULT NULL'),
        ('file_size',         'INTEGER DEFAULT 0'),
        ('file_type',         'TEXT DEFAULT NULL'),
        ('layer_signatures',  'INTEGER DEFAULT 0'),
        ('layer_entropy',     'INTEGER DEFAULT 0'),
        ('layer_pe',          'INTEGER DEFAULT 0'),
        ('layer_behavior',    'INTEGER DEFAULT 0'),
        ('yara_matched_count','INTEGER DEFAULT 0'),
        ('yara_total_score',  'INTEGER DEFAULT 0'),
        ('chain_count',       'INTEGER DEFAULT 0'),
        ('chain_score',       'INTEGER DEFAULT 0'),
        ('detection_reasons', 'TEXT DEFAULT NULL'),
        ('verdict_reason_en', 'TEXT DEFAULT NULL'),
        ('verdict_reason_ar', 'TEXT DEFAULT NULL'),
        ('file_path',         'TEXT DEFAULT NULL'),
        ('scan_source',       'TEXT DEFAULT NULL'),
    ]
    for col, defn in new_cols:
        try:
            conn.execute(f'ALTER TABLE scans ADD COLUMN {col} {defn}')
        except sqlite3.OperationalError:
            pass  # column already exists

    # Create users table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT NOT NULL,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            verified      BOOLEAN DEFAULT 0,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
    print("Database initialized")

# --- Users table operations ---

def create_user(username: str, email: str, password_hash: str):
    conn = get_connection()
    try:
        conn.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                     (username, email, password_hash))
        conn.commit()
    except sqlite3.IntegrityError:
        # Email already registered
        return False
    finally:
        conn.close()
    return True

def get_user_by_email(email: str):
    conn = get_connection()
    row = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()
    return dict(row) if row else None

def mark_user_verified(email: str):
    conn = get_connection()
    conn.execute('UPDATE users SET verified = 1 WHERE email = ?', (email,))
    conn.commit()
    conn.close()

def update_password(email: str, password_hash: str):
    conn = get_connection()
    conn.execute('UPDATE users SET password_hash = ? WHERE email = ?', (password_hash, email))
    conn.commit()
    conn.close()

def update_username(email: str, new_username: str):
    conn = get_connection()
    conn.execute('UPDATE users SET username = ? WHERE email = ?', (new_username, email))
    conn.commit()
    conn.close()

def _native(value):
    """Coerce numpy scalars and other types for SQLite."""
    if value is None:
        return None
    try:
        import numpy as np
        if isinstance(value, np.generic):
            return value.item()
    except ImportError:
        pass
    if isinstance(value, bool):
        return int(value)
    return value


def insert_scan_log(result: dict, file_path: str = None, username: str = None, scan_source: str = None) -> int:
    """
    Insert one scan row into `scans` (Scan Logs in the frontend).
    Returns the new row id.
    """
    import json

    init_db()
    conn = get_connection()
    try:
        lb = result.get('layerBreakdown') or {}
        chains = result.get('apiChains') or {}
        yara = result.get('yaraMatches') or {}
        metrics = result.get('metrics') or {}
        reasons = result.get('detectionReasons') or []
        if isinstance(reasons, str):
            reasons_json = reasons
        else:
            reasons_json = json.dumps(reasons, ensure_ascii=False)

        row = {
            'filename': result.get('filename', 'unknown'),
            'time': result.get('time') or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'total_rows': _native(result.get('totalRows', 1)),
            'total_features': _native(result.get('totalFeatures', 0)),
            'benign_count': _native(result.get('benignCount', 0)),
            'ransomware_count': _native(result.get('ransomwareCount', 0)),
            'overall_label': result.get('overallLabel', 'Unknown'),
            'overall_confidence': _native(result.get('overallConfidence', 0)),
            'accuracy': _native(metrics.get('accuracy', 0)),
            'precision': _native(metrics.get('precision', 0)),
            'recall': _native(metrics.get('recall', 0)),
            'f1': _native(metrics.get('f1', 0)),
            'username': username,
            'risk_score': _native(result.get('riskScore', 0)),
            'entropy': _native(result.get('entropy', 0)),
            'entropy_header': _native(result.get('entropyHeader', 0)),
            'entropy_middle': _native(result.get('entropyMiddle', 0)),
            'entropy_tail': _native(result.get('entropyTail', 0)),
            'signature_match': 1 if result.get('signatureMatch') else 0,
            'signature_family': result.get('signatureFamily'),
            'file_size': _native(result.get('fileSize', 0)),
            'file_type': result.get('fileType'),
            'layer_signatures': _native(lb.get('signatures', 0)),
            'layer_entropy': _native(lb.get('entropy', 0)),
            'layer_pe': _native(lb.get('peStructure', 0)),
            'layer_behavior': _native(lb.get('behavior', 0)),
            'yara_matched_count': _native(result.get('yaraMatchedCount', 0)),
            'yara_total_score': _native(result.get('yaraTotalScore', yara.get('totalScore', 0))),
            'chain_count': _native(result.get('chainCount', chains.get('chainCount', 0))),
            'chain_score': _native(result.get('chainScore', chains.get('totalScore', 0))),
            'detection_reasons': reasons_json,
            'verdict_reason_en': result.get('verdictReasonEn') or '',
            'verdict_reason_ar': result.get('verdictReasonAr') or '',
            'file_path': file_path or result.get('filePath') or result.get('file_path'),
            'scan_source': scan_source or result.get('scanSource') or result.get('scan_source'),
        }

        table_cols = {r[1] for r in conn.execute(f"PRAGMA table_info({SCAN_LOG_TABLE})").fetchall()}
        insert_cols = [c for c in row.keys() if c in table_cols]
        if 'filename' not in insert_cols or 'time' not in insert_cols:
            raise RuntimeError(f"{SCAN_LOG_TABLE} table is missing required columns")

        placeholders = ", ".join("?" for _ in insert_cols)
        col_sql = ", ".join(insert_cols)
        values = tuple(row[c] for c in insert_cols)

        cur = conn.execute(
            f"INSERT INTO {SCAN_LOG_TABLE} ({col_sql}) VALUES ({placeholders})",
            values,
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()


def save_scan(result: dict, username: str = None):
    """Backward-compatible wrapper used by the Flask API."""
    insert_scan_log(
        result,
        file_path=result.get('filePath') or result.get('file_path'),
        username=username,
        scan_source=result.get('scanSource') or result.get('scan_source'),
    )

def get_all_scans(username: str = None):
    conn = get_connection()
    if username:
        rows = conn.execute(
            'SELECT * FROM scans WHERE username = ? OR username = ? ORDER BY id DESC',
            (username, 'Guest')
        ).fetchall()
    else:
        rows = conn.execute('SELECT * FROM scans ORDER BY id DESC').fetchall()
    conn.close()
    return [dict(r) for r in rows]

def delete_all_scans(username: str = None):
    conn = get_connection()
    if username:
        conn.execute('DELETE FROM scans WHERE username = ? OR username = ?', (username, 'Guest'))
    else:
        conn.execute('DELETE FROM scans')
    conn.commit()
    conn.close()


def delete_ransomware_scans(username: str = None) -> int:
    """Delete alert rows only (scans where overall_label is Ransomware). Returns deleted count."""
    conn = get_connection()
    try:
        if username:
            cur = conn.execute(
                "DELETE FROM scans WHERE (username = ? OR username = ?) AND overall_label = ?",
                (username, "Guest", "Ransomware"),
            )
        else:
            cur = conn.execute(
                "DELETE FROM scans WHERE overall_label = ?",
                ("Ransomware",),
            )
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()
