<div align="center">

<img src="https://img.shields.io/badge/-%F0%9F%9B%A1%EF%B8%8F%20SARMZ%20RansomGuard-1a1a2e?style=for-the-badge&logoColor=white" height="60" alt="SARMZ RansomGuard"/>

<h1>🛡️ SARMZ RansomGuard</h1>

<p><strong>Next-Generation Ransomware Detection, Real-Time EDR Monitoring & ML-Powered Threat Intelligence</strong></p>

<p>
  <img src="https://img.shields.io/badge/React%2018-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask"/>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white" alt="Scikit-Learn"/>
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite"/>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
</p>

<p>
  <img src="https://img.shields.io/badge/ML%20Accuracy-98.9%25-success?style=for-the-badge" alt="Accuracy"/>
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License"/>
  <img src="https://img.shields.io/badge/Version-2.1.4-red?style=for-the-badge" alt="Version"/>
  <img src="https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=for-the-badge" alt="Status"/>
</p>

<br/>

> **SARMZ RansomGuard** is a full-stack, production-grade cybersecurity platform engineered to detect, analyze, and neutralize ransomware threats through advanced Machine Learning behavioral indicators and real-time Endpoint Detection & Response (EDR) monitoring.

<br/>

[🚀 Live Demo](https://ransomware-attack-detection-using.onrender.com) · [📖 Documentation](#-getting-started) · [🐛 Report Bug](https://github.com/x0ll/Ransomware-Attack-Detection-Using-Machine-Learning/issues) · [💡 Request Feature](https://github.com/x0ll/Ransomware-Attack-Detection-Using-Machine-Learning/issues)

</div>

---

## 📸 System Screenshots

> A full walkthrough of the **SARMZ RansomGuard** platform — from authentication to threat detection and reporting.

---

### 🖥️ Analytics Dashboard

<div align="center">
  <img src="docs/screenshots/dashboard.png" width="90%" alt="Dashboard"/>
  <br/>
  <sub>Real-time threat metrics · Scan distribution charts · System integrity status · Live security event log</sub>
</div>

---

### 🔐 Authentication

<div align="center">

| Sign In | Create Account |
|:---:|:---:|
| <img src="docs/screenshots/login.png" width="420" alt="Login"/> | <img src="docs/screenshots/register.png" width="420" alt="Register"/> |
| Bilingual login (EN/AR) with dark mode toggle | Secure registration with email OTP verification |

</div>

---

### 🔬 Threat Analysis

<div align="center">

| File Analysis Engine | URL Threat Scanner |
|:---:|:---:|
| <img src="docs/screenshots/file_analysis.png" width="420" alt="File Analysis"/> | <img src="docs/screenshots/url_scanner.png" width="420" alt="URL Scanner"/> |
| Deep PE inspection · Entropy scoring · Multi-layer ML results | Real-time URL analysis for phishing & malware threats |

</div>

---

### 🚨 Alerts & Monitoring

<div align="center">

| Security Alerts | Alert Detail View |
|:---:|:---:|
| <img src="docs/screenshots/alerts.png" width="420" alt="Alerts"/> | <img src="docs/screenshots/alert_detail.png" width="420" alt="Alert Detail"/> |
| Critical/Warning alerts with severity classification | Full threat intelligence modal with ML model metrics |

</div>

---

### 🗂️ Logs, Settings & Reporting

<div align="center">

| Scan Logs | Settings Panel |
|:---:|:---:|
| <img src="docs/screenshots/scan_logs.png" width="420" alt="Scan Logs"/> | <img src="docs/screenshots/settings.png" width="420" alt="Settings"/> |
| Full audit history with color-coded results & accuracy scores | Language, theme, profile & protection configuration |

</div>

<br/>

<div align="center">
  <img src="docs/screenshots/pdf_report.png" width="45%" alt="PDF Report"/>
  <br/>
  <sub>📄 Auto-generated Executive Security Report — threat intelligence profiles, model diagnostics & MITRE ATT&CK mappings</sub>
</div>

---

## 🌟 About The Project

**SARMZ RansomGuard** is an advanced cybersecurity framework built as a graduation project, combining the power of **Machine Learning** with **real-time Endpoint Detection and Response (EDR)** to provide multi-layered ransomware protection.

The system operates on two fronts simultaneously:
- **🌐 Web Interface**: An interactive React dashboard for on-demand file and URL threat analysis, scan history, and ML model management.
- **🤖 EDR Agent (`monitor.py`)**: A silent background sentinel that continuously watches OS directories, intercepts suspicious executables, and delivers instant threat notifications — all without user intervention.

---

## ✨ Core Features

<table>
  <tr>
    <td>🔍 <strong>Intelligent File Inspection</strong></td>
    <td>Deep binary analysis extracting entropy scores, PE headers, imported APIs, and section metadata, all mapped to a trained Random Forest classifier achieving <strong>98.9% accuracy</strong>.</td>
  </tr>
  <tr>
    <td>🌐 <strong>URL Threat Intelligence</strong></td>
    <td>Scan URLs for phishing, malware droppers, ransomware C2 servers, and domain reputation scoring in real time.</td>
  </tr>
  <tr>
    <td>👁️ <strong>Proactive EDR Agent</strong></td>
    <td>Non-blocking background sentinel monitoring critical OS directories (Downloads, Desktop, AppData) for suspicious executables using Watchdog filesystem events.</td>
  </tr>
  <tr>
    <td>🔔 <strong>Instant OS Notifications</strong></td>
    <td>Native Windows Toast notifications alert users upon detecting and blocking high-entropy or untrusted binaries in real time — zero latency, zero interference.</td>
  </tr>
  <tr>
    <td>📊 <strong>Interactive Analytics Dashboard</strong></td>
    <td>Live metrics showing total scans, threat distribution, detection rates, and ML performance (Accuracy, Precision, Recall, F1-Score) with beautiful interactive charts.</td>
  </tr>
  <tr>
    <td>📄 <strong>Executive PDF Reports</strong></td>
    <td>Auto-generated, professionally formatted PDF security reports with full threat intelligence profiles, model diagnostics, and MITRE ATT&CK framework mappings.</td>
  </tr>
  <tr>
    <td>🧠 <strong>Dynamic Model Retraining</strong></td>
    <td>Admin panel for uploading new behavioral datasets and retraining the Random Forest model on-the-fly without system downtime.</td>
  </tr>
  <tr>
    <td>🔐 <strong>Secure Authentication System</strong></td>
    <td>JWT token-based auth with user registration, email OTP verification, password reset flows, and granular Guest/Admin permission scoping.</td>
  </tr>
  <tr>
    <td>🌍 <strong>Full Bilingual Support</strong></td>
    <td>Complete Arabic/English UI localization with RTL layout switching and persistent user language preference.</td>
  </tr>
  <tr>
    <td>🌙 <strong>Dark / Light Theme</strong></td>
    <td>Premium dark and light modes with smooth animated transitions and persistent user preference across sessions.</td>
  </tr>
</table>

---

## 🏗️ System Architecture

```
SARMZ-RansomGuard/
│
├── 🖥️ frontend/                        React + Vite Client Application
│   ├── src/
│   │   ├── pages/                      Route-level UI Views
│   │   │   ├── Dashboard.tsx           ─ Live metrics & chart analytics
│   │   │   ├── FileAnalysis.tsx        ─ Binary upload & ML classification
│   │   │   ├── UrlScanner.tsx          ─ URL threat intelligence scanner
│   │   │   ├── ScanLogs.tsx            ─ Historical audit log viewer
│   │   │   ├── Alerts.tsx              ─ Real-time threat alert feed
│   │   │   ├── Training.tsx            ─ Model retraining interface
│   │   │   ├── Settings.tsx            ─ User profile & preferences
│   │   │   ├── Login.tsx               ─ Secure auth entry point
│   │   │   └── About.tsx               ─ Team & project info
│   │   ├── components/
│   │   │   └── Sidebar.tsx             ─ Navigation & session state
│   │   └── lib/
│   │       ├── store.ts                ─ Global reactive state (Zustand)
│   │       └── language.ts             ─ i18n Arabic/English translations
│   └── index.html
│
├── ⚙️ backend/                         Python Flask Production Engine
│   ├── app/
│   │   ├── api_endpoints.py            ─ All REST API route handlers
│   │   ├── file_analyzer.py            ─ Core ML threat classification engine
│   │   ├── database.py                 ─ SQLite schema & connection management
│   │   ├── email_server.py             ─ SMTP email OTP service
│   │   └── server.py                   ─ Flask app factory & CORS config
│   ├── models/
│   │   └── random_forest_model.pkl     ─ Trained ML classifier (98.9% accuracy)
│   ├── datasets/                       ─ Behavioral malware training data
│   ├── monitor.py                      ─ EDR Background Agent & Toast daemon
│   └── requirements.txt               ─ Python dependency manifest
│
└── 📊 streamlit_app.py                 Interactive ML analytics dashboard
```

---

## 🧪 ML Model Performance

| Metric | Score |
|:---|:---:|
| ✅ Accuracy | **98.9%** |
| 🎯 Precision | **99.0%** |
| 🔁 Recall | **98.9%** |
| ⚖️ F1-Score | **98.9%** |
| 🌲 Algorithm | **Random Forest Classifier** |
| 📂 Training Samples | **62,000+ labeled binaries** |

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|:---|:---|
| Node.js | `>= 18.0.0` |
| Python | `3.11.x` recommended |
| pip | Latest |
| OS (for EDR Agent) | Windows 10/11 |
| Admin Privileges | Required for EDR filesystem monitoring |

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/x0ll/Ransomware-Attack-Detection-Using-Machine-Learning.git
cd Ransomware-Attack-Detection-Using-Machine-Learning
```

### 2️⃣ Backend Setup

```bash
cd backend

# Create and activate virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate        # Linux/macOS
.venv\Scripts\activate           # Windows

# Install all dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials
```

### 3️⃣ Launch the Backend API

```bash
cd backend
python run.py
```
> 🟢 API server starts on: `http://localhost:5000`

### 4️⃣ Launch the EDR Background Agent

Open a separate terminal and run the background monitor:

```bash
cd backend
python monitor.py
```
> 🛡️ The agent silently monitors your system directories for ransomware activity.

### 5️⃣ Launch the Frontend

```bash
cd frontend
npm install
npm run dev
```
> 🌐 Web client launches on: `http://localhost:5173`

---

## 🔗 API Reference

All authenticated endpoints require a valid Bearer token in the `Authorization` header.

| Endpoint | Method | Auth | Description |
|:---|:---:|:---:|:---|
| `/api/auth/register` | `POST` | ❌ | Create a new user account |
| `/api/auth/login` | `POST` | ❌ | Login and receive JWT token |
| `/api/auth/verify-otp` | `POST` | ❌ | Verify email OTP code |
| `/api/auth/reset-password` | `POST` | ❌ | Trigger password reset flow |
| `/api/analyze` | `POST` | ✅ | Upload & analyze binary file for threats |
| `/api/scan-url` | `POST` | ✅ | Scan a URL for malicious indicators |
| `/api/scans` | `GET` | ✅ | Retrieve personal scan history |
| `/api/scans` | `DELETE` | ✅ | Clear scan history |
| `/api/dashboard/stats` | `GET` | ✅ | Fetch live dashboard metrics |
| `/api/model/retrain` | `POST` | ✅ Admin | Trigger ML model retraining |
| `/api/health` | `GET` | ❌ | Backend health check |

---

## 🗄️ Database Schema

```sql
-- Users Table
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  verified      BOOLEAN DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scans Table
CREATE TABLE scans (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  filename       TEXT NOT NULL,
  scan_time      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  overall_label  TEXT NOT NULL,       -- 'Ransomware' | 'Safe'
  confidence     REAL NOT NULL,       -- 0.0 – 1.0
  username       TEXT,
  source         TEXT,               -- 'web_upload' | 'edr_agent'
  entropy        REAL,
  pe_sections    INTEGER,
  api_calls      INTEGER
);
```

---

## 🛡️ Security Architecture

```
                    ┌─────────────────────────────────┐
                    │        SARMZ RansomGuard         │
                    │      Dual-Layer Defense           │
                    └─────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                                           │
   ┌──────────▼──────────┐              ┌────────────▼────────────┐
   │   Web Interface      │              │    EDR Background Agent  │
   │  (User Triggered)    │              │  (Autonomous, Real-Time) │
   └──────────┬──────────┘              └────────────┬────────────┘
              │                                       │
   ┌──────────▼──────────┐              ┌────────────▼────────────┐
   │  File / URL Upload   │              │  Watchdog FS Events API  │
   └──────────┬──────────┘              └────────────┬────────────┘
              │                                       │
   ┌──────────▼──────────┐              ┌────────────▼────────────┐
   │  ML Classifier        │              │  Entropy + Heuristic    │
   │  (Random Forest)      │              │  Behavioral Analysis    │
   └──────────┬──────────┘              └────────────┬────────────┘
              │                                       │
   ┌──────────▼──────────┐              ┌────────────▼────────────┐
   │  Result → Dashboard  │              │  BLOCK + OS Notification │
   └─────────────────────┘              └─────────────────────────┘
```

---

## 👨‍💻 Team

<div align="center">

| <img src="https://github.com/x0ll.png" width="80" style="border-radius:50%"/> | <img src="https://github.com/Samal3.png" width="80" style="border-radius:50%"/> |
|:---:|:---:|
| **Saud Al-Asmari** | **Abdulrahman Alfaifi** |
| [![GitHub](https://img.shields.io/badge/GitHub-x0ll-181717?style=flat-square&logo=github)](https://github.com/x0ll) | [![GitHub](https://img.shields.io/badge/GitHub-Samal3-181717?style=flat-square&logo=github)](https://github.com/Samal3) |

</div>

---

## 🛡️ Security Disclaimer

> ⚠️ **This system is designed exclusively for academic research, malware behavior profiling, and engineering graduation showcase purposes.**
>
> Always test suspicious or untested executables within a **heavily isolated environment** such as a dedicated VirtualBox/VMware sandbox. Never execute unknown binaries on production or personal machines.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for Advanced Malware Detection & Endpoint Security Research**

⭐ Star this repository if you found it useful!

</div>