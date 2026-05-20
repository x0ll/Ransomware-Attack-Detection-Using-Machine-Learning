<h1 align="center">🛡️ SARMZ RansomGuard</h1>

<p align="center">
  <strong>Advanced Ransomware Detection, Real-Time EDR Monitoring & Machine Learning Analytics</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue" alt="Frontend">
  <img src="https://img.shields.io/badge/Backend-Python%20Flask-green" alt="Backend">
  <img src="https://img.shields.io/badge/EDR%20Agent-Windows%20Monitor-red" alt="EDR Agent">
  <img src="https://img.shields.io/badge/Database-SQLite-lightgrey" alt="Database">
  <img src="https://img.shields.io/badge/Machine%20Learning-Random%20Forest-orange" alt="ML">
</p>

## 📖 About The Project

**SARMZ RansomGuard** is an advanced, full-stack cybersecurity framework designed to detect, analyze, and mitigate potential ransomware threats using Machine Learning behavioral indicators. It provides a dual-layer defense architecture: an interactive responsive web application for explicit file profiling, and a proactive background **EDR (Endpoint Detection and Response) Agent** that continuously monitors the operating environment.

The architecture cleanly integrates a responsive **React/Vite** frontend (styled with TailwindCSS) with a multi-threaded **Python Flask** production engine that handles static payload dissection, real-time threat telemetry synchronization, localized SQLite persistence, and secure token-based user workflows.

---

## ✨ Key Features

- 🔍 **Intelligent Payload Inspection**: Upload binaries to immediately evaluate deep file behaviors and extract threat vectors mapped to a trained Random Forest model.
- 👁️ **Proactive EDR Agent (`monitor.py`)**: A continuous background sentinel leveraging non-blocking asynchronous event listening to monitor critical OS directories (e.g., Downloads, Desktop) for suspicious executables.
- 🔔 **Native OS Notifications**: Integrated asynchronous Windows Toast notifications that instantly alert the endpoint user upon blocking high-entropy or untrusted binaries without inducing process lagging.
- 📊 **Interactive Analytics Dashboard**: Live reporting displaying real-time system metrics, total audited objects, telemetry distribution, and exact classification metrics (Accuracy, Precision, Recall, F1-Score).
- 🧠 **Dynamic Core Retraining**: Direct access via the administrator dashboard to update, optimize, and retrain the underlying Machine Learning model with new behavioral datasets.
- 🔐 **Hardened Authentication Workflow**: User management architecture featuring secure registration, JWT token generation, password resets via Email OTP, and full telemetry filtering for `Guest` session states.
- 🌐 **Bilingual Architecture**: Full localized layout translation supporting both English and Arabic languages seamlessly.
- 🌙 **Persistent Theme Toggling**: Fluid Dark/Light configuration designed for dynamic operating conditions.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 powered by Vite (Production Build ready)
- **Styling**: Tailwind CSS & Modern Web Icons
- **State & Routing**: React Router DOM & Clean Custom Reactive Hooks

### Backend & Endpoint Agent
- **Framework**: Flask (Python Multi-Threaded Core)
- **Real-Time Monitoring**: Watchdog OS Filesystem Events API
- **Machine Learning**: Scikit-Learn (Random Forest Classifier Core), Pandas, NumPy
- **Asynchronous Alerts**: Native WinToaster Notification Engine
- **Database Layer**: Robust SQLite3 Instance with Unified Session Telemetry Sync

---

## 📂 Project Architecture

```text
SARMZ-RansomGuard/
├── backend/                        <- Python Production Ecosystem
│   ├── app/                        <- Core Engine & Modular Logic
│   │   ├── models/                 <- Serialized Machine Learning Brains (.pkl)
│   │   ├── datasets/               <- Validated Behavioral Malware Datasets (.csv)
│   │   ├── routes.py               <- Secure Restful API Handler
│   │   └── database.py             <- SQLite Global Initialization & Connection Pools
│   ├── monitor.py                  <- Proactive Background EDR Agent & Windows Toast Daemon
│   ├── ransomwareguard.db          <- Local Unified Relational Database
│   ├── server.py                   <- Main Flask Application Entry Point
│   └── requirements.txt            <- Python Dependencies & Security Modules
│
└── frontend/                       <- Client Interface Subsystem
    ├── src/
    │   ├── pages/                  <- UI Views (Dashboard, Telemetry Logs, Security Settings)
    │   ├── components/             <- Modular Component System (Charts, Dynamic Tables)
    │   └── lib/                    <- Persistent State, Localization & Theme Stores
    ├── index.html
    └── package.json                <- Node.js Package Manifest
## 🚀 Getting Started

Ensure your deployment machine satisfies the configuration environment requirements before initialization.

### Prerequisites
- **Node.js**: Version 18.0.0 or higher
- **Python**: Version 3.11.x recommended
- **Native Admin Privileges** (required for local background directory filesystem auditing)

### 1. Repository Access & Deployment

```bash
git clone https://github.com/x0ll/Ransomware-Attack-Detection-Using-Machine-Learning.git
cd Ransomware-Attack-Detection-Using-Machine-Learning
```

### 2. Backend & EDR Environment Setup

Initialize the backend environment, parse local dependencies, and spin up the microservices. The structural SQLite tables materialize instantly upon execution.

```bash
# Install dependencies
pip install -r requirements.txt

# Launch the Primary Web API Service
python server.py
```

The API server boots up locally on: `http://localhost:5000`

### 3. Launching the EDR Background Agent

To spin up the continuous endpoint system monitor that safeguards local directories against active ransomware injections:

```bash
python monitor.py
```

### 4. Client Web Core Initialization

Open an isolated shell environment to initialize the front-end rendering server.

```bash
cd frontend
npm install
npm run dev
```

The web graphical client launches on: `http://localhost:5173`

---

## 🔗 API Reference

Secure routes require valid Authorization bearer tokens. Unauthenticated evaluations fallback gracefully under global Guest flags.

| Endpoint | Method | Payload / Context | System Action |
| :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | `{username, email, password}` | Generates a new secure system profile |
| `/api/auth/login` | `POST` | `{username, password}` | Validates profile and returns access token |
| `/api/analyze` | `POST` | Form-Data (Binary payload) | Dissects file attributes via ML Classifier |
| `/api/scans` | `GET` | Headers: Token (Optional) | Pulls localized filtered historic telemetry |
| `/api/scans` | `DELETE` | Headers: Token | Completely purges scoped historical logs |
| `/api/health` | `GET` | None | Returns operational health status of backend |

---

## 🗄️ Database Structure

The ecosystem utilizes a relational SQLite layout designed to keep the analytical state clean and responsive:

- **Users Table**: Manages encrypted cryptographic profiles (`id`, `username`, `email`, `password_hash`, `verified`).
- **Scans Table**: Centralizes real-time audit logs collected from both the manual Web uploader interface and the automatic EDR Background Agent (`id`, `filename`, `time`, `overall_label`, `confidence`, `username`, and ML metadata metrics).

---

## 🛡️ Security Disclaimer

This system is engineered for advanced academic profiling, automated malware identification prototyping, and engineering graduation defense showcases. Execute untested or suspicious payloads exclusively within heavily sandboxed environments (e.g., dedicated VirtualBox instances).

---

## 🤝 Contributing


Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/x0ll/Ransomware-Attack-Detection-Using-Machine-Learning/issues).



---

*Developed with ❤️ for Advanced Malware Detection and Security.*