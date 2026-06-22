import sqlite3
import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

# Dynamically locate and load the .env file
if getattr(sys, 'frozen', False):
    # Running inside a PyInstaller compiled .exe bundle
    base_dir = os.path.dirname(sys.executable)
else:
    # Running in standard Python development mode
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

env_path = os.path.join(base_dir, '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv() # Fallback to standard load

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ransomguard.db'))
SCAN_LOG_TABLE = "scans"

SUPABASE_URL = "https://irtopfmptbwhrbkmezuw.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydG9wZm1wdGJ3aHJia21lenV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjA0OTg0MSwiZXhwIjoyMDk3NjI1ODQxfQ.Alzufrcd8kllSrqXH9d2IGIc9NOrHJrPOjxZBNxNbjI"

# Initialize Supabase client
supabase = None
if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("✅ RansomGuard Supabase client initialized.")
    except Exception as e:
        print(f"❌ Failed to initialize RansomGuard Supabase client: {e}")
else:
    print("⚠️ Warning: Supabase credentials missing for RansomGuard.")

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

def delete_user_by_email(email: str):
    conn = get_connection()
    try:
        row = conn.execute('SELECT username FROM users WHERE email = ?', (email,)).fetchone()
        if row:
            username = row['username']
            conn.execute('DELETE FROM scans WHERE username = ?', (username,))
        conn.execute('DELETE FROM users WHERE email = ?', (email,))
        conn.commit()
    finally:
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
    Insert one scan row into `ransomguard_alerts` matching the exact Supabase schema.
    """
    
    init_db()
    try:
        # تجهيز البيانات لتطابق أعمدة الجدول في السحاب بالملي
        row = {
            'file_path': file_path or result.get('filePath') or result.get('file_path') or result.get('filename', 'unknown'),
            'behavior_type': result.get('overall_label') or result.get('overallLabel', 'Ransomware'),
            'threat_level': 'CRITICAL' if _native(result.get('riskScore', 0)) > 75 else 'HIGH'
        }

        if supabase:
            res = supabase.table('ransomguard_alerts').insert(row).execute()
            # التحقق من نجاح الإرسال وطباعة تأكيد في التيرمينال
            if res.data and len(res.data) > 0:
                print("🚀 [Supabase] Alert successfully synced to cloud!")
                return int(res.data[0].get('id', 0))
        return 0
    except Exception as e:
        print(f"❌ Error inserting scan log into Supabase: {e}")
        return 0

def save_scan(result: dict, username: str = None):
    """Backward-compatible wrapper used by the Flask API."""
    insert_scan_log(
        result,
        file_path=result.get('filePath') or result.get('file_path'),
        username=username,
        scan_source=result.get('scanSource') or result.get('scan_source'),
    )

def get_all_scans(username: str = None):
    if not supabase:
        return []
    try:
        if username:
            res = supabase.table('ransomguard_alerts').select('*').or_(f"username.eq.{username},username.eq.Guest").order('id', desc=True).execute()
        else:
            res = supabase.table('ransomguard_alerts').select('*').order('id', desc=True).execute()
        return res.data
    except Exception as e:
        print(f"Error fetching scans from Supabase: {e}")
        return []

def delete_all_scans(username: str = None):
    if not supabase:
        return
    try:
        if username:
            supabase.table('ransomguard_alerts').delete().or_(f"username.eq.{username},username.eq.Guest").execute()
        else:
            supabase.table('ransomguard_alerts').delete().neq('id', 0).execute()
    except Exception as e:
        print(f"Error deleting scans from Supabase: {e}")

def delete_ransomware_scans(username: str = None) -> int:
    """Delete alert rows only (scans where overall_label is Ransomware). Returns deleted count."""
    if not supabase:
        return 0
    try:
        if username:
            res = supabase.table('ransomguard_alerts').delete().or_(f"username.eq.{username},username.eq.Guest").eq('overall_label', 'Ransomware').execute()
        else:
            res = supabase.table('ransomguard_alerts').delete().eq('overall_label', 'Ransomware').execute()
        return len(res.data) if res.data else 0
    except Exception as e:
        print(f"Error deleting ransomware scans from Supabase: {e}")
        return 0
