import os
import time
import subprocess
import requests
import tldextract
import streamlit as st
import tempfile

# Configuration for VirusTotal
VIRUSTOTAL_API_KEY = "f4be63f6af35d7b0e42ebb4c88295f4055b80e4637ffbffd529cbe63dc868e2a"
LEGIT_DOMAINS = ["google", "microsoft", "apple", "amazon", "facebook", "telegram", "paypal"]

# ==========================================
# 1. Digital Signature Verification
# ==========================================
def verify_digital_signature(exe_path):
    """
    Checks if an executable is signed by a trusted vendor using PowerShell's Get-AuthenticodeSignature.
    """
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

# ==========================================
# 2. URL Scanning Module (VirusTotal & Phishing)
# ==========================================
def scan_url_logic(url):
    results = []
    
    # A. Phishing Analysis (Typosquatting & Suspicious TLDs)
    extracted = tldextract.extract(url)
    domain = extracted.domain.lower()
    tld = extracted.suffix.lower()
    
    suspicious_tlds = ["xyz", "top", "tk", "ml", "ga", "cf", "gq", "cc", "pw"]
    
    if tld in suspicious_tlds:
        results.append(f"⚠️ Warning: URL uses a suspicious Top-Level Domain (.{tld})")
        
    for legit in LEGIT_DOMAINS:
        if domain != legit and legit in domain:
            results.append(f"⚠️ Warning: Possible typosquatting detected. Contains '{legit}' but domain is '{domain}.{tld}'")
            
    # B. VirusTotal API Check
    if VIRUSTOTAL_API_KEY == "YOUR_VIRUSTOTAL_API_KEY" or not VIRUSTOTAL_API_KEY:
        results.append("ℹ️ Skipping VirusTotal check: API Key not configured.")
        return results

    vt_url = "https://www.virustotal.com/api/v3/urls"
    headers = {
        "accept": "application/json",
        "x-apikey": VIRUSTOTAL_API_KEY,
        "content-type": "application/x-www-form-urlencoded"
    }
    
    try:
        response = requests.post(vt_url, data={"url": url}, headers=headers)
        if response.status_code == 200:
            analysis_id = response.json()['data']['id']
            analysis_url = f"https://www.virustotal.com/api/v3/analyses/{analysis_id}"
            
            # Wait a few seconds before requesting results (usually takes a moment)
            time.sleep(3) 
            
            result_response = requests.get(analysis_url, headers={"x-apikey": VIRUSTOTAL_API_KEY})
            if result_response.status_code == 200:
                stats = result_response.json()['data']['attributes']['stats']
                malicious = stats.get('malicious', 0)
                suspicious = stats.get('suspicious', 0)
                harmless = stats.get('harmless', 0)
                
                vt_result = f"🔍 VirusTotal Results: {malicious} Malicious | {suspicious} Suspicious | {harmless} Harmless"
                results.append(vt_result)
                
                if malicious > 0 or suspicious > 0:
                    results.append("🚨 ALARM: URL flagged as malicious/suspicious by security vendors!")
                else:
                    results.append("✅ URL appears clean on VirusTotal.")
            else:
                results.append("❌ Failed to retrieve analysis results from VirusTotal.")
        else:
            results.append(f"❌ Failed to submit URL to VirusTotal. Status Code: {response.status_code}")
    except Exception as e:
        results.append(f"❌ Error querying VirusTotal: {str(e)}")
        
    return results

# ==========================================
# Mock ML Prediction Logic
# ==========================================
def mock_ml_prediction(file_path):
    """
    Placeholder for your actual ML model inference.
    """
    # Simply sleep to simulate processing time
    time.sleep(1.5)
    # Mock result (replace with your model's actual predict call)
    return "Malicious" # Pretend the model flagged it

# ==========================================
# Streamlit UI
# ==========================================
st.set_page_config(page_title="RansomGuard - Trust but Verify", layout="centered")
st.title("🛡️ RansomGuard Analyzer")
st.markdown("Advanced Ransomware Detection with 'Trust-but-Verify' Logic")

# Use Streamlit Tabs for clean layout
tab1, tab2 = st.tabs(["File Analysis", "URL Scanner"])

# ------------------------------
# TAB 1: File Analysis
# ------------------------------
with tab1:
    st.header("Upload Executable for Analysis")
    st.markdown("We will first verify the file's digital signature. If it is signed by a trusted vendor, we will skip the ML check to avoid false positives.")
    
    uploaded_file = st.file_uploader("Choose a file (.exe, .dll, etc.)", type=["exe", "dll", "bin"])
    
    if uploaded_file is not None:
        if st.button("Analyze File"):
            # Save uploaded file to a temporary location for signature verification
            with tempfile.NamedTemporaryFile(delete=False, suffix=".exe") as tmp_file:
                tmp_file.write(uploaded_file.getbuffer())
                tmp_path = tmp_file.name

            try:
                with st.spinner("Checking Digital Signature..."):
                    is_signed, sig_msg = verify_digital_signature(tmp_path)
                
                if is_signed:
                    st.success(f"✅ File is SAFE. {sig_msg}")
                    st.info("Skipping Machine Learning prediction to avoid False Positives on trusted applications (Trust-but-Verify).")
                else:
                    st.warning(f"⚠️ Digital Signature Check Failed: {sig_msg}")
                    st.info("File is unsigned or signature is invalid. Proceeding to ML Behavioral Analysis...")
                    
                    with st.spinner("Running ML Model Analysis..."):
                        ml_result = mock_ml_prediction(tmp_path)
                        
                        if ml_result == "Malicious":
                            st.error(f"🚨 ML Model Prediction: {ml_result}")
                        else:
                            st.success(f"✅ ML Model Prediction: {ml_result}")
            finally:
                # Clean up the temporary file
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

# ------------------------------
# TAB 2: URL Scanner
# ------------------------------
with tab2:
    st.header("URL Scanner & Phishing Detection")
    st.markdown("Analyze URLs for typosquatting and check them against VirusTotal.")
    
    target_url = st.text_input("Enter URL to Scan (e.g., http://paypal-login.xyz)", placeholder="https://example.com")
    
    if st.button("Scan URL"):
        if not target_url:
            st.warning("Please enter a valid URL.")
        else:
            with st.spinner(f"Scanning {target_url} ..."):
                scan_output = scan_url_logic(target_url)
                
                st.subheader("Scan Results:")
                for result in scan_output:
                    if "✅" in result:
                        st.success(result)
                    elif "⚠️" in result:
                        st.warning(result)
                    elif "🚨" in result or "❌" in result:
                        st.error(result)
                    else:
                        st.info(result)
