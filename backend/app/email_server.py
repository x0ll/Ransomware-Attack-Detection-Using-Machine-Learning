import os
import random
import string
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from app.database import create_user, get_user_by_email, mark_user_verified, update_password, update_username, delete_user_by_email

# Load environment variables
load_dotenv()

auth_api = Blueprint("auth_api", __name__)

# SMTP Configuration (Gmail)
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

# In-memory store for OTP codes (keyed by email)
_codes: dict = {}

def generate_code() -> str:
    return ''.join(random.choices(string.digits, k=6))

def send_email(to_email: str, code: str, purpose: str = "verify") -> tuple[bool, str]:
    if not EMAIL_USER or not EMAIL_PASS:
        return False, "SMTP credentials missing"
        
    try:
        subject = "🔐 SARMZ RansomGuard - Verification Code" if purpose == "verify" \
                  else "🔑 SARMZ RansomGuard - Password Reset"
        
        color    = "#22c55e" if purpose == "verify" else "#f59e0b"
        title    = "Email Verification" if purpose == "verify" else "Password Reset"
        subtitle = "Use the code below to verify your email" if purpose == "verify" \
                   else "Use the code below to reset your password"

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ margin: 0; padding: 0; background-color: #060d1a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }}
                .container {{ max-width: 500px; margin: 40px auto; background: #0d1117; border: 1px solid #1e2a3a; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
                .header {{ background: linear-gradient(135deg, {color}20, #0d1117); padding: 30px; text-align: center; border-bottom: 1px solid #1e2a3a; }}
                .logo {{ color: #fff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: 1px; }}
                .content {{ padding: 40px 30px; text-align: center; }}
                .title {{ color: #fff; font-size: 22px; margin: 0 0 10px; font-weight: 700; }}
                .subtitle {{ color: #8b949e; font-size: 15px; margin: 0 0 35px; }}
                .code-box {{ background: #0a0e1a; border: 2px solid {color}; border-radius: 15px; padding: 25px; display: inline-block; box-shadow: 0 0 20px {color}20; }}
                .code {{ color: {color}; font-size: 42px; font-weight: 800; letter-spacing: 10px; font-family: 'Courier New', Courier, monospace; }}
                .footer {{ padding: 20px; text-align: center; border-top: 1px solid #1e2a3a; background: #090c12; }}
                .footer-text {{ color: #484f58; font-size: 12px; margin: 0; }}
                .timer {{ color: #6e7681; font-size: 13px; margin-top: 25px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 class="logo">🛡️ SARMZ RANSOMGUARD</h1>
                </div>
                <div class="content">
                    <h2 class="title">{title}</h2>
                    <p class="subtitle">{subtitle}</p>
                    <div class="code-box">
                        <span class="code">{code}</span>
                    </div>
                    <p class="timer">⏱️ This code will expire in <b>10 minutes</b></p>
                </div>
                <div class="footer">
                    <p class="footer-text">© 2025 SARMZ RansomGuard Security · {to_email}</p>
                </div>
            </div>
        </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["From"] = f"SARMZ RansomGuard <{EMAIL_USER}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)
            
        return True, "ok"
    except Exception as e:
        print(f"[SMTP ERROR] {e}")
        return False, str(e)


@auth_api.route("/send-code", methods=["POST"])
def send_code():
    data    = request.get_json() or {}
    email   = data.get("email",   "").strip().lower()
    purpose = data.get("purpose", "verify")

    if not email or "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({"error": "Invalid email address"}), 400

    code       = generate_code()
    expires_at = time.time() + 600  # expires in 10 minutes

    _codes[email] = {"code": code, "expires_at": expires_at}

    success, err = send_email(email, code, purpose)

    if success:
        print(f"[EMAIL OK] Code sent to {email}")
        return jsonify({"message": "Code sent successfully"}), 200
    else:
        print(f"[EMAIL FAIL] {err}")
        return jsonify({"error": f"Failed to send: {err}"}), 500


@auth_api.route("/verify-code", methods=["POST"])
def verify_code():
    data  = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    code  = data.get("code",  "").strip()

    stored = _codes.get(email)
    if not stored:
        return jsonify({"valid": False, "error": "No code found"}), 400

    if time.time() > stored["expires_at"]:
        del _codes[email]
        return jsonify({"valid": False, "error": "Code expired"}), 400

    if stored["code"] != code:
        return jsonify({"valid": False, "error": "Invalid code"}), 400

    del _codes[email]
    # Mark the user as verified in the database
    mark_user_verified(email)

    return jsonify({"valid": True}), 200


@auth_api.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not username or not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    if get_user_by_email(email):
        return jsonify({"error": "Email already registered"}), 400

    password_hash = generate_password_hash(password)

    if create_user(username, email, password_hash):
        return jsonify({"message": "User registered successfully"}), 200
    else:
        return jsonify({"error": "Registration failed"}), 500

@auth_api.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = get_user_by_email(email)

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({"message": "Login successful", "username": user["username"]}), 200

@auth_api.route("/check-email", methods=["POST"])
def check_email():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()

    if get_user_by_email(email):
        return jsonify({"exists": True}), 200
    else:
        return jsonify({"error": "Email not found"}), 404

@auth_api.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    new_password = data.get("newPassword", "")

    if not get_user_by_email(email):
        return jsonify({"error": "User not found"}), 404

    if len(new_password) < 6:
        return jsonify({"error": "Password too short"}), 400

    password_hash = generate_password_hash(new_password)
    update_password(email, password_hash)

    return jsonify({"message": "Password reset successfully"}), 200
    
@auth_api.route("/update-profile", methods=["POST"])
def update_profile():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    new_username = data.get("newUsername", "").strip()
    new_password = data.get("newPassword", "")

    user = get_user_by_email(email)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if new_username:
        update_username(email, new_username)
        user["username"] = new_username

    if new_password:
        if len(new_password) < 6:
            return jsonify({"error": "Password too short"}), 400
        password_hash = generate_password_hash(new_password)
        update_password(email, password_hash)

    return jsonify({"message": "Profile updated successfully", "username": user["username"]}), 200

@auth_api.route("/delete-account", methods=["POST"])
def delete_account():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
        
    user = get_user_by_email(email)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    try:
        delete_user_by_email(email)
        return jsonify({"message": "Account deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
