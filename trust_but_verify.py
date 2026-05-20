import os
import time
import subprocess
import requests
import tldextract
from collections import defaultdict
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Configuration
VIRUSTOTAL_API_KEY = "f4be63f6af35d7b0e42ebb4c88295f4055b80e4637ffbffd529cbe63dc868e2a"
HONEYPOT_DIR = r"C:\Users\Abdrh\OneDrive\سطح المكتب\Graduation Project\PRO2-Rnsm\PRO2\decoy_folder" # Create this folder and set the path
MONITOR_DIR = r"C:\Users\Abdrh\OneDrive\سطح المكتب\Graduation Project\PRO2-Rnsm\PRO2" # e.g., C:\Users\Username\Documents
MAX_MODIFICATIONS = 50
TIME_WINDOW_SEC = 10

# Known legitimate domains to check against for typosquatting
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
        # Use PowerShell to check the Authenticode signature
        ps_command = f"(Get-AuthenticodeSignature '{exe_path}').Status"
        result = subprocess.run(
            ["powershell", "-Command", ps_command],
            capture_output=True,
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        
        status = result.stdout.strip()
        if status == "Valid":
            return True, "Valid Signature (Trusted)"
        else:
            return False, f"Signature Status: {status}"
    except Exception as e:
        return False, f"Error verifying signature: {str(e)}"

# ==========================================
# 2 & 3. File System Monitoring (High-Frequency & Honeypot)
# ==========================================
class FileMonitorHandler(FileSystemEventHandler):
    def __init__(self, honeypot_path):
        self.honeypot_path = os.path.abspath(honeypot_path)
        self.modification_history = defaultdict(list)
    
    def process_event(self, event):
        if event.is_directory:
            return

        file_path = os.path.abspath(event.src_path)
        current_time = time.time()
        
        # 3. Honeypot Monitoring
        # If any file inside the honeypot directory is touched, flag immediately.
        if file_path.startswith(self.honeypot_path):
            print(f"[!] ALARM: Honeypot file accessed/modified! Path: {file_path}")
            # Add termination/blocking logic here
            return

        # 2. High-Frequency API Monitoring (Mass-Encryption Pattern)
        # We simulate tracking by counting overall file modifications in the monitored directory
        # In a real EDR, you would track this per-process (PID). Watchdog tracks it system-wide for the dir.
        self.modification_history['global'].append(current_time)
        
        # Remove timestamps older than our time window (10 seconds)
        recent_modifications = [
            t for t in self.modification_history['global'] 
            if current_time - t <= TIME_WINDOW_SEC
        ]
        self.modification_history['global'] = recent_modifications
        
        if len(recent_modifications) > MAX_MODIFICATIONS:
            print(f"[!] ALARM: Mass-encryption pattern detected! ({len(recent_modifications)} modifications in {TIME_WINDOW_SEC}s)")
            self.modification_history['global'].clear() # Reset after alarming

    def on_modified(self, event):
        self.process_event(event)
        
    def on_created(self, event):
        self.process_event(event)

def start_monitoring():
    """Starts the Watchdog observer for the specified directories."""
    if not os.path.exists(HONEYPOT_DIR):
        os.makedirs(HONEYPOT_DIR)
        print(f"Created Honeypot directory at {HONEYPOT_DIR}")

    event_handler = FileMonitorHandler(HONEYPOT_DIR)
    observer = Observer()
    
    # Schedule monitoring for both the target user directory and the honeypot
    observer.schedule(event_handler, MONITOR_DIR, recursive=True)
    if not MONITOR_DIR.startswith(HONEYPOT_DIR) and not HONEYPOT_DIR.startswith(MONITOR_DIR):
        observer.schedule(event_handler, HONEYPOT_DIR, recursive=True)
        
    observer.start()
    print(f"[*] Started File Monitoring on {MONITOR_DIR}")
    print(f"[*] Honeypot Active on {HONEYPOT_DIR}")
    return observer

# ==========================================
# 4. URL Scanning Module (VirusTotal & Phishing)
# ==========================================
def scan_url(url):
    print(f"\n--- Scanning URL: {url} ---")
    
    # A. Phishing Analysis (Typosquatting & Suspicious TLDs)
    extracted = tldextract.extract(url)
    domain = extracted.domain.lower()
    tld = extracted.suffix.lower()
    
    suspicious_tlds = ["xyz", "top", "tk", "ml", "ga", "cf", "gq", "cc", "pw"]
    
    print("[*] Performing Heuristic Phishing Check...")
    if tld in suspicious_tlds:
        print(f"[!] Warning: URL uses a suspicious Top-Level Domain (.{tld})")
        
    for legit in LEGIT_DOMAINS:
        # Check if it's a typosquat (e.g., faceb00k vs facebook) 
        # Simple distance check could be added here, but for now we look for substrings or near matches
        if domain != legit and legit in domain:
            print(f"[!] Warning: Possible typosquatting detected. Contains '{legit}' but domain is '{domain}.{tld}'")
            
    # B. VirusTotal API Check
    print("[*] Querying VirusTotal API...")
    if VIRUSTOTAL_API_KEY == "YOUR_VIRUSTOTAL_API_KEY":
        print("[-] Skipping VirusTotal check: API Key not configured.")
        return

    vt_url = "https://www.virustotal.com/api/v3/urls"
    headers = {
        "accept": "application/json",
        "x-apikey": VIRUSTOTAL_API_KEY,
        "content-type": "application/x-www-form-urlencoded"
    }
    
    try:
        # 1. Submit the URL to VirusTotal
        response = requests.post(vt_url, data={"url": url}, headers=headers)
        if response.status_code == 200:
            analysis_id = response.json()['data']['id']
            
            # 2. Poll until analysis status is 'completed'
            analysis_url = f"https://www.virustotal.com/api/v3/analyses/{analysis_id}"
            print("[*] Polling VirusTotal for results (max 60s)...")
            
            max_retries = 12
            poll_interval = 5
            analysis_completed = False
            
            for attempt in range(max_retries):
                time.sleep(poll_interval)
                result_response = requests.get(analysis_url, headers={"x-apikey": VIRUSTOTAL_API_KEY})
                
                if result_response.status_code == 200:
                    res_data = result_response.json()
                    status = res_data['data']['attributes'].get('status', '')
                    print(f"    Attempt {attempt + 1}/{max_retries} - Status: {status}")
                    
                    if status == 'completed':
                        stats = res_data['data']['attributes']['stats']
                        malicious = stats.get('malicious', 0)
                        suspicious = stats.get('suspicious', 0)
                        harmless = stats.get('harmless', 0)
                        undetected = stats.get('undetected', 0)
                        
                        print(f"[*] VirusTotal Results: {malicious} Malicious | {suspicious} Suspicious | {harmless} Harmless | {undetected} Undetected")
                        if malicious > 0 or suspicious > 0:
                            print("[!] ALARM: URL flagged as malicious/suspicious by security vendors!")
                        analysis_completed = True
                        break
                else:
                    print(f"[-] Failed to retrieve analysis. HTTP {result_response.status_code}")
                    break
            
            if not analysis_completed:
                print("[-] VirusTotal analysis timed out. Try again later.")
        else:
            print(f"[-] Failed to submit URL to VirusTotal. Status Code: {response.status_code}")
    except Exception as e:
        print(f"[-] Error querying VirusTotal: {str(e)}")

# ==========================================
# Main Execution Entry Point
# ==========================================
if __name__ == "__main__":
    print("=== Ransomware Trust-but-Verify System ===")
    
    # 1. Test Signature Verification
    test_exe = r"C:\Windows\System32\cmd.exe" # Replace with path to Telegram.exe or other app
    print(f"\nChecking signature for: {test_exe}")
    is_valid, msg = verify_digital_signature(test_exe)
    print(f"Result: {msg}")

    # 2. Start File Monitoring (Background)
    print("\nStarting Background Monitoring...")
    observer = start_monitoring()

    # 3. Test URL Scanner
    try:
        while True:
            print("\nOptions:")
            print("1. Scan a URL")
            print("2. Exit")
            choice = input("Enter choice (1/2): ")
            
            if choice == '1':
                test_url = input("Enter URL to scan (e.g., http://google-security-update.xyz): ")
                scan_url(test_url)
            elif choice == '2':
                break
    except KeyboardInterrupt:
        pass
    finally:
        observer.stop()
        observer.join()
        print("\nMonitoring stopped.")
