from flask import Blueprint, request, jsonify
import os
import subprocess
import tempfile
import requests
import tldextract
import time
from app.prediction_service import PredictionService
from app.database import save_scan, get_all_scans, delete_all_scans, delete_ransomware_scans
from app.file_analyzer import analyze_file, analyze_csv_file, SUPPORTED_EXTENSIONS

api = Blueprint("api", __name__)
MODEL_PATH = os.path.join("models", "random_forest_model.pkl")
_service = PredictionService(MODEL_PATH)
model = _service.model

VIRUSTOTAL_API_KEY = "f4be63f6af35d7b0e42ebb4c88295f4055b80e4637ffbffd529cbe63dc868e2a"
LEGIT_DOMAINS = ["google", "microsoft", "apple", "amazon", "facebook", "telegram", "paypal"]

def verify_digital_signature(exe_path):
    if not os.path.exists(exe_path):
        return False, "File does not exist"
    try:
        ps_command = f"(Get-AuthenticodeSignature '{exe_path}').Status"
        result = subprocess.run(
            ["powershell", "-Command", ps_command],
            capture_output=True,
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        status = result.stdout.strip()
        if status == "Valid":
            return True, "Valid Signature (Trusted Vendor)"
        else:
            return False, f"Signature Status: {status}"
    except Exception as e:
        return False, f"Error verifying signature: {str(e)}"

@api.route("/scan-url", methods=["POST"])
def scan_url():
    try:
        data = request.json
        url = data.get("url")
        if not url:
            return jsonify({"error": "No URL provided"}), 400
            
        results = []
        
        # Phishing Analysis
        extracted = tldextract.extract(url)
        domain = extracted.domain.lower() if extracted.domain else ""
        tld = extracted.suffix.lower() if extracted.suffix else ""
        
        suspicious_tlds = ["xyz", "top", "tk", "ml", "ga", "cf", "gq", "cc", "pw"]
        
        if tld in suspicious_tlds:
            results.append({"type": "warning", "message": f"URL uses a suspicious Top-Level Domain (.{tld})"})
            
        for legit in LEGIT_DOMAINS:
            if domain != legit and legit in domain:
                results.append({"type": "warning", "message": f"Possible typosquatting detected. Contains '{legit}' but domain is '{domain}.{tld}'"})
                
        # VirusTotal API Check
        if not VIRUSTOTAL_API_KEY or VIRUSTOTAL_API_KEY == "YOUR_VIRUSTOTAL_API_KEY":
            results.append({"type": "info", "message": "Skipping threat intelligence check: API Key not configured."})
        else:
            vt_url = "https://www.virustotal.com/api/v3/urls"
            headers = {
                "accept": "application/json",
                "x-apikey": VIRUSTOTAL_API_KEY,
                "content-type": "application/x-www-form-urlencoded"
            }
            try:
                # Step 1: Submit the URL to VirusTotal
                response = requests.post(vt_url, data={"url": url}, headers=headers)
                if response.status_code == 200:
                    analysis_id = response.json()['data']['id']
                    analysis_url = f"https://www.virustotal.com/api/v3/analyses/{analysis_id}"
                    
                    # Step 2: Poll until analysis status is 'completed'
                    # Retry up to 12 times with 5-second intervals (max ~60 seconds)
                    max_retries = 12
                    poll_interval = 5
                    analysis_completed = False
                    
                    for attempt in range(max_retries):
                        time.sleep(poll_interval)
                        res = requests.get(analysis_url, headers={"x-apikey": VIRUSTOTAL_API_KEY})
                        
                        if res.status_code == 200:
                            res_data = res.json()
                            status = res_data['data']['attributes'].get('status', '')
                            
                            if status == 'completed':
                                stats = res_data['data']['attributes']['stats']
                                mal = stats.get('malicious', 0)
                                sus = stats.get('suspicious', 0)
                                hrm = stats.get('harmless', 0)
                                und = stats.get('undetected', 0)
                                
                                results.append({"type": "info", "message": f"Threat Intelligence Results: {mal} Malicious | {sus} Suspicious | {hrm} Harmless | {und} Undetected"})
                                if mal > 0 or sus > 0:
                                    results.append({"type": "error", "message": "URL flagged as malicious/suspicious by security vendors!"})
                                else:
                                    results.append({"type": "success", "message": "URL appears clean across all security vendors."})
                                analysis_completed = True
                                break
                        else:
                            break
                    
                    if not analysis_completed:
                        results.append({"type": "warning", "message": "Threat analysis timed out. The URL may still be queued for scanning."})
                else:
                    results.append({"type": "error", "message": f"Failed to submit URL for analysis. Status: {response.status_code}"})
            except Exception as e:
                results.append({"type": "error", "message": f"Error during threat analysis: {str(e)}"})
                
        return jsonify({"url": url, "results": results})

    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


@api.route("/analyze", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    username = request.form.get("username", "Guest")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        return jsonify({
            "error": f"File type '{ext}' not supported",
            "supportedTypes": sorted(list(SUPPORTED_EXTENSIONS))
        }), 400

    try:
        # Save to a temporary file instead of reading all into memory
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        def run_analysis():
            try:
                if ext == '.csv':
                    # CSV still needs bytes for pandas io.BytesIO or we can read from disk
                    with open(tmp_path, 'rb') as f:
                        csv_data = f.read()
                    result = analyze_csv_file(csv_data, file.filename, model)
                else:
                    # Optimized: Pass the path directly to the analyzer
                    result = analyze_file(tmp_path, file.filename, model)

                # Save the result to the database linked to this user
                save_scan(result, username)
                return result
            except Exception as e:
                print(f"Analysis error: {str(e)}")
                return {"error": str(e)}
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

        result = run_analysis()
        if "error" in result:
            return jsonify(result), 500
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/supported-types", methods=["GET"])
def supported_types():
    return jsonify({
        "types": sorted(list(SUPPORTED_EXTENSIONS)),
        "categories": {
            "Executable": [".exe", ".dll", ".sys", ".bat", ".cmd", ".ps1", ".vbs", ".js"],
            "Documents":  [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"],
            "Archives":   [".zip", ".rar", ".7z", ".tar", ".gz"],
            "Scripts":    [".py", ".rb", ".sh"],
            "Data":       [".csv", ".json", ".xml", ".txt"],
            "Mobile":     [".jar", ".apk"]
        }
    })


@api.route("/scans", methods=["GET"])
def get_scans():
    import json
    try:
        username = request.args.get("username")
        scans = get_all_scans(username)
        formatted = [{
            "id": str(s["id"]),
            "filename": s["filename"],
            "time": s["time"],
            "totalRows": s["total_rows"],
            "totalFeatures": s["total_features"],
            "benignCount": s["benign_count"],
            "ransomwareCount": s["ransomware_count"],
            "overallLabel": s["overall_label"],
            "overallConfidence": s["overall_confidence"],
            "metrics": {
                "accuracy":  s["accuracy"],
                "precision": s["precision"],
                "recall":    s["recall"],
                "f1":        s["f1"]
            },
            "riskScore":       s.get("risk_score", 0),
            "entropy":         s.get("entropy", 0),
            "entropyHeader":   s.get("entropy_header", 0),
            "entropyMiddle":   s.get("entropy_middle", 0),
            "entropyTail":     s.get("entropy_tail", 0),
            "signatureMatch":  bool(s.get("signature_match", 0)),
            "signatureFamily": s.get("signature_family"),
            "fileSize":        s.get("file_size", 0),
            "fileType":        s.get("file_type"),
            "layerBreakdown": {
                "signatures": s.get("layer_signatures", 0),
                "entropy":    s.get("layer_entropy", 0),
                "peStructure":s.get("layer_pe", 0),
                "behavior":   s.get("layer_behavior", 0),
            },
            "yaraMatchedCount": s.get("yara_matched_count", 0),
            "yaraTotalScore":   s.get("yara_total_score", 0),
            "chainCount":       s.get("chain_count", 0),
            "chainScore":       s.get("chain_score", 0),
            "detectionReasons": json.loads(s["detection_reasons"]) if s.get("detection_reasons") else [],
            "verdictReasonEn":  s.get("verdict_reason_en") or "",
            "verdictReasonAr":  s.get("verdict_reason_ar") or "",
        } for s in scans]
        return jsonify(formatted)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/scans", methods=["DELETE"])
def clear_scans():
    try:
        username = request.args.get("username")
        delete_all_scans(username)
        return jsonify({"message": "All scans deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/alerts", methods=["DELETE"])
def clear_alerts():
    """Delete all ransomware alert records for the current user."""
    try:
        username = request.args.get("username")
        deleted = delete_ransomware_scans(username)
        return jsonify({"message": "Alerts deleted", "deleted": deleted})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "SARMZ RansomGuard Backend Running"})
