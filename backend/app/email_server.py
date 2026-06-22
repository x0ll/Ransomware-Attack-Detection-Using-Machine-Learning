import os
import random
import string
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from app.database import supabase, delete_user_by_email

# Load environment variables
load_dotenv()

auth_api = Blueprint("auth_api", __name__)

# SMTP Configuration (Gmail)
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")
RECEIVER_EMAIL = os.getenv("RECEIVER_EMAIL", EMAIL_USER)
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


def get_supabase_user_by_email(email: str):
    if not supabase:
        return None
    try:
        res = supabase.auth.admin.list_users()
        users = getattr(res, "users", res) or []
        for u in users:
            if getattr(u, "email", "").lower() == email.lower():
                return u
    except Exception as e:
        print(f"[Supabase Admin Error] List users failed: {e}")
    return None

@auth_api.route("/send-code", methods=["POST"])
def send_code():
    data    = request.get_json() or {}
    email   = data.get("email",   "").strip().lower()
    purpose = data.get("purpose", "verify")

    if not email or "@" not in email:
        return jsonify({"error": "Invalid email address"}), 400

    if not supabase:
        return jsonify({"error": "Supabase client not initialized"}), 500

    try:
        if purpose == "reset":
            # Send password reset OTP via Supabase Auth
            supabase.auth.reset_password_for_email(email)
            print(f"[Supabase Auth] Reset code sent to {email}")
        else:
            # Try to send a login/verification OTP
            try:
                supabase.auth.sign_in_with_otp({"email": email})
                print(f"[Supabase Auth] Login OTP sent to {email}")
            except Exception as e:
                # If unconfirmed, sign_in_with_otp might fail. Resend signup confirmation.
                supabase.auth.resend({"type": "signup", "email": email})
                print(f"[Supabase Auth] Signup OTP resent to {email}")
                
        return jsonify({"message": "Code sent successfully"}), 200
    except Exception as e:
        print(f"[Supabase Auth Error] Send code failed: {e}")
        return jsonify({"error": f"Failed to send code: {str(e)}"}), 500


@auth_api.route("/verify-code", methods=["POST"])
def verify_code():
    data  = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    code  = data.get("code",  "").strip()

    if not email or not code:
        return jsonify({"valid": False, "error": "Missing fields"}), 400

    if not supabase:
        return jsonify({"valid": False, "error": "Supabase client not initialized"}), 500

    # Try verifying as email OTP (login)
    try:
        supabase.auth.verify_otp({"email": email, "token": code, "type": "email"})
        print(f"[Supabase Auth] Email OTP verified for {email}")
        return jsonify({"valid": True}), 200
    except Exception as e:
        # Try verifying as signup OTP
        try:
            supabase.auth.verify_otp({"email": email, "token": code, "type": "signup"})
            print(f"[Supabase Auth] Signup OTP verified for {email}")
            return jsonify({"valid": True}), 200
        except Exception as e2:
            print(f"[Supabase Auth Error] Verify OTP failed for {email}: {e} | {e2}")
            return jsonify({"valid": False, "error": "Invalid verification code"}), 400


@auth_api.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not username or not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    if not supabase:
        return jsonify({"error": "Supabase client not initialized"}), 500

    try:
        res = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "username": username
                }
            }
        })
        return jsonify({"message": "User registered successfully"}), 200
    except Exception as e:
        err_msg = str(e)
        if "already registered" in err_msg.lower() or "already exists" in err_msg.lower():
            return jsonify({"error": "Email already registered"}), 400
        return jsonify({"error": err_msg}), 500

@auth_api.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    if not supabase:
        return jsonify({"error": "Supabase client not initialized"}), 500

    try:
        res = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        user_data = res.user
        username = user_data.user_metadata.get("username", "User") if user_data and user_data.user_metadata else "User"
        return jsonify({"message": "Login successful", "username": username}), 200
    except Exception as e:
        err_msg = str(e)
        if "confirm" in err_msg.lower() or "verified" in err_msg.lower():
            # If the email is unconfirmed, but the password is correct, allow user to proceed to verification code screen
            u = get_supabase_user_by_email(email)
            if u:
                username = u.user_metadata.get("username", "User") if u.user_metadata else "User"
                return jsonify({"message": "Login successful", "username": username}), 200
        return jsonify({"error": "Invalid email or password"}), 401

@auth_api.route("/check-email", methods=["POST"])
def check_email():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"exists": False}), 400

    user = get_supabase_user_by_email(email)
    if user:
        return jsonify({"exists": True}), 200
    else:
        return jsonify({"error": "Email not found"}), 404

@auth_api.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    code = data.get("code", "").strip()
    new_password = data.get("newPassword", "")

    if not email or not code or not new_password:
        return jsonify({"error": "Missing fields"}), 400

    if not supabase:
        return jsonify({"error": "Supabase client not initialized"}), 500

    try:
        # 1. Verify recovery OTP
        supabase.auth.verify_otp({"email": email, "token": code, "type": "recovery"})
        # 2. Get user object
        user = get_supabase_user_by_email(email)
        if not user:
            return jsonify({"error": "User not found"}), 404
        # 3. Update password via Admin API
        supabase.auth.admin.update_user_by_id(user.id, {"password": new_password})
        print(f"[Supabase Auth] Password reset successful for {email}")
        return jsonify({"message": "Password reset successfully"}), 200
    except Exception as e:
        print(f"[Supabase Auth Error] Reset password failed: {e}")
        return jsonify({"error": f"Password reset failed: {str(e)}"}), 400
    
@auth_api.route("/update-profile", methods=["POST"])
def update_profile():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    new_username = data.get("newUsername", "").strip()
    new_password = data.get("newPassword", "")

    if not email:
        return jsonify({"error": "Email is required"}), 400

    if not supabase:
        return jsonify({"error": "Supabase client not initialized"}), 500

    user = get_supabase_user_by_email(email)
    if not user:
        return jsonify({"error": "User not found"}), 404

    try:
        attrs = {}
        if new_username:
            current_metadata = getattr(user, "user_metadata", {}) or {}
            current_metadata["username"] = new_username
            attrs["user_metadata"] = current_metadata
        if new_password:
            if len(new_password) < 6:
                return jsonify({"error": "Password too short"}), 400
            attrs["password"] = new_password

        if attrs:
            supabase.auth.admin.update_user_by_id(user.id, attrs)
            print(f"[Supabase Auth] Profile updated for {email}")
        return jsonify({"message": "Profile updated successfully", "username": new_username or getattr(user, "user_metadata", {}).get("username", "User")}), 200
    except Exception as e:
        print(f"[Supabase Auth Error] Update profile failed: {e}")
        return jsonify({"error": str(e)}), 500

@auth_api.route("/delete-account", methods=["POST"])
def delete_account():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    
    if not email:
        return jsonify({"error": "Email is required"}), 400

    if not supabase:
        return jsonify({"error": "Supabase client not initialized"}), 500
        
    user = get_supabase_user_by_email(email)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    try:
        supabase.auth.admin.delete_user(user.id)
        try:
            delete_user_by_email(email)
        except Exception as sqlite_err:
            print(f"Non-critical SQLite delete user warning: {sqlite_err}")
        print(f"[Supabase Auth] Account deleted for {email}")
        return jsonify({"message": "Account deleted successfully"}), 200
    except Exception as e:
        print(f"[Supabase Auth Error] Delete account failed: {e}")
        return jsonify({"error": str(e)}), 500

def send_ticket_email(sender_email: str, subject_text: str, message_text: str) -> tuple[bool, str]:
    if not EMAIL_USER or not EMAIL_PASS:
        return False, "SMTP credentials missing"
        
    try:
        subject = f"🚨 SARMZ RansomGuard SOC Ticket: {subject_text}"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ margin: 0; padding: 0; background-color: #060d1a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }}
                .container {{ max-width: 600px; margin: 40px auto; background: #0d1117; border: 1px solid #1e2a3a; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
                .header {{ background: linear-gradient(135deg, #ef444420, #0d1117); padding: 30px; text-align: center; border-bottom: 1px solid #1e2a3a; }}
                .logo {{ color: #fff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: 1px; }}
                .content {{ padding: 30px; text-align: left; color: #c9d1d9; }}
                .title {{ color: #fff; font-size: 20px; margin: 0 0 15px; font-weight: 700; border-bottom: 1px solid #1e2a3a; padding-bottom: 10px; }}
                .field {{ margin-bottom: 20px; }}
                .label {{ color: #8b949e; font-size: 13px; font-weight: 600; text-transform: uppercase; margin-bottom: 5px; display: block; }}
                .val {{ color: #ffffff; font-size: 15px; background: #0a0e1a; border: 1px solid #1e2a3a; border-radius: 8px; padding: 12px; font-family: monospace; white-space: pre-wrap; }}
                .footer {{ padding: 20px; text-align: center; border-top: 1px solid #1e2a3a; background: #090c12; }}
                .footer-text {{ color: #484f58; font-size: 12px; margin: 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 class="logo">🚨 SARMZ SOC SUPPORT</h1>
                </div>
                <div class="content">
                    <h2 class="title">New Security Ticket Submitted</h2>
                    
                    <div class="field">
                        <span class="label">User/Sender Email</span>
                        <div class="val">{sender_email}</div>
                    </div>
                    
                    <div class="field">
                        <span class="label">Subject</span>
                        <div class="val">{subject_text}</div>
                    </div>
                    
                    <div class="field">
                        <span class="label">Message Details</span>
                        <div class="val">{message_text}</div>
                    </div>
                </div>
                <div class="footer">
                    <p class="footer-text">© 2026 SARMZ RansomGuard SOC System</p>
                </div>
            </div>
        </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["From"] = f"SARMZ SOC Portal <{EMAIL_USER}>"
        msg["To"] = RECEIVER_EMAIL
        msg["Subject"] = subject
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)
            
        return True, "ok"
    except Exception as e:
        print(f"[SMTP TICKET ERROR] {e}")
        return False, str(e)

@auth_api.route("/submit-soc-ticket", methods=["POST"])
def submit_soc_ticket():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    subject = data.get("subject", "").strip()
    message = data.get("message", "").strip()

    if not email or not subject or not message:
        return jsonify({"error": "Missing fields"}), 400

    success, err = send_ticket_email(email, subject, message)
    if success:
        return jsonify({"message": "Ticket submitted successfully"}), 200
    else:
        return jsonify({"error": f"Failed to submit ticket: {err}"}), 500
