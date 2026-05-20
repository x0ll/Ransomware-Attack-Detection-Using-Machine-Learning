<h1 align="center">🛡️ SARMZ RansomGuard</h1>

<p align="center">
  <strong>Ransomware Attack Detection Using Machine Learning</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue" alt="Frontend">
  <img src="https://img.shields.io/badge/Backend-Python%20Flask-green" alt="Backend">
  <img src="https://img.shields.io/badge/Database-SQLite-lightgrey" alt="Database">
  <img src="https://img.shields.io/badge/Machine%20Learning-Random%20Forest-orange" alt="ML">
</p>

## 📖 About The Project

**SARMZ RansomGuard** is an advanced, full-stack application designed to detect and analyze potential ransomware threats using machine learning. It provides a seamless interface for users to upload files, which are then parsed and analyzed against a trained Random Forest model. 

The project features a **React/Vite** frontend with a beautiful, responsive user interface (styled with TailwindCSS) and a robust **Flask** backend that manages data processing, machine learning predictions, database interactions, and secure user authentication.

---

## ✨ Key Features

- 🔍 **Intelligent File Analysis**: Upload files to instantly predict and classify ransomware vs. benign data.
- 📊 **Interactive Dashboard**: View real-time statistics, scan logs, and detailed metrics (Accuracy, Precision, Recall, F1-Score).
- 🧠 **Dynamic ML Model Training**: Retrain the model on new data directly from the user interface.
- 🔐 **Secure Authentication**: User registration and login system with Two-Factor Authentication (2FA) and password resets via Email OTP.
- 🌐 **Bilingual Support**: Built-in support for both English and Arabic languages.
- ℹ️ **Comprehensive About Section**: Detailed system information and mission statement accessible directly from the login page.
- 🌙 **Dark/Light Mode**: Beautiful UI that adapts to your preferences.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **State Management**: Zustand / Recoil (custom hooks)

### Backend
- **Framework**: Flask (Python)
- **Machine Learning**: Scikit-Learn (Random Forest Classifier), Pandas, NumPy
- **Authentication**: JWT, bcrypt, OTP via SMTP Email Server
- **Database**: SQLite3

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites
- Node.js (v18 or higher)
- Python (3.8 or higher)
- pip and npm installed

### 1. Clone the repository
```bash
git clone https://github.com/x0ll/Ransomware-Attack-Detection-Using-Machine-Learning.git
cd Ransomware-Attack-Detection-Using-Machine-Learning
```

### 2. Backend Setup
Navigate to the backend directory, install dependencies, and start the server. The SQLite database will be created automatically.

```bash
cd backend
pip install -r requirements.txt
python run.py
```
> The backend server will start on `http://localhost:5000`

### 3. Frontend Setup
Open a new terminal window, navigate to the frontend directory, install npm packages, and start the development server.

```bash
cd frontend
npm install
npm run dev
```
> The frontend application will be available at `http://localhost:5173`

---

## 📂 Project Architecture

```text
SARMZ-RansomGuard/
├── backend/                         <- Python Flask API
│   ├── app/                         <- Core logic, endpoints, ML processing
│   ├── models/                      <- Pre-trained models (.pkl)
│   ├── datasets/                    <- ML datasets (.csv, .json)
│   ├── run.py                       <- Backend entry point
│   └── requirements.txt             <- Python dependencies
│
└── frontend/                        <- React + Vite Application
    ├── src/
    │   ├── pages/                   <- UI Views (Dashboard, Login, Settings, etc.)
    │   ├── components/              <- Reusable UI components
    │   └── lib/                     <- Store, Theme, Language support
    ├── index.html
    └── package.json                 <- Node.js dependencies
```

---

## 🔗 API Reference

Here are the main API endpoints provided by the backend:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Register a new user |
| `/api/auth/login` | `POST` | Authenticate user & get token |
| `/api/analyze` | `POST` | Upload and analyze a file with ML |
| `/api/scans` | `GET` | Fetch user scan history |
| `/api/scans` | `DELETE` | Clear scan history |
| `/api/health` | `GET` | Check API status |

---

## 🗄️ Database Structure

The project uses SQLite with two primary tables:

1. **Users Table**: Stores user credentials (`id`, `username`, `email`, `password_hash`, `verified`).
2. **Scans Table**: Stores analysis history (`id`, `filename`, `time`, `overall_label`, `confidence`, `username`, and ML metrics).

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/x0ll/Ransomware-Attack-Detection-Using-Machine-Learning/issues).

---
*Developed with ❤️ for Advanced Malware Detection and Security.*
