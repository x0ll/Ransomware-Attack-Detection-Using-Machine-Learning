import os
import math
import struct
import hashlib
import pandas as pd
import numpy as np
from typing import Dict


def calculate_entropy(data: bytes) -> float:
    if not data:
        return 0.0
    freq = {}
    for byte in data:
        freq[byte] = freq.get(byte, 0) + 1
    entropy = 0.0
    length = len(data)
    for count in freq.values():
        p = count / length
        if p > 0:
            entropy -= p * math.log2(p)
    return round(entropy, 4)


def extract_pe_features(data: bytes) -> Dict:
    features = {}
    try:
        # Validate MZ header
        if data[:2] != b'MZ':
            return {}

        # Get PE header offset from the DOS stub
        pe_offset = struct.unpack('<I', data[60:64])[0]
        if pe_offset + 4 > len(data):
            return {}

        # Validate PE signature
        if data[pe_offset:pe_offset+4] != b'PE\x00\x00':
            return {}

        # Parse COFF header fields
        machine = struct.unpack('<H', data[pe_offset+4:pe_offset+6])[0]
        num_sections = struct.unpack('<H', data[pe_offset+6:pe_offset+8])[0]
        timestamp = struct.unpack('<I', data[pe_offset+8:pe_offset+12])[0]
        characteristics = struct.unpack('<H', data[pe_offset+22:pe_offset+24])[0]

        # Parse Optional Header
        opt_offset = pe_offset + 24
        magic = struct.unpack('<H', data[opt_offset:opt_offset+2])[0]
        is_pe32plus = (magic == 0x20b)

        size_of_code = struct.unpack('<I', data[opt_offset+4:opt_offset+8])[0]
        size_of_initialized = struct.unpack('<I', data[opt_offset+8:opt_offset+12])[0]
        size_of_uninitialized = struct.unpack('<I', data[opt_offset+12:opt_offset+16])[0]
        entry_point = struct.unpack('<I', data[opt_offset+16:opt_offset+20])[0]

        features = {
            'Machine': machine,
            'NumberOfSections': num_sections,
            'TimeDateStamp': timestamp,
            'Characteristics': characteristics,
            'MajorLinkerVersion': data[opt_offset+2] if opt_offset+2 < len(data) else 0,
            'MinorLinkerVersion': data[opt_offset+3] if opt_offset+3 < len(data) else 0,
            'SizeOfCode': size_of_code,
            'SizeOfInitializedData': size_of_initialized,
            'SizeOfUninitializedData': size_of_uninitialized,
            'AddressOfEntryPoint': entry_point,
            'SizeOfImage': struct.unpack('<I', data[opt_offset+56:opt_offset+60])[0] if opt_offset+60 <= len(data) else 0,
            'SizeOfHeaders': struct.unpack('<I', data[opt_offset+60:opt_offset+64])[0] if opt_offset+64 <= len(data) else 0,
            'Entropy': calculate_entropy(data),
            'FileSize': len(data),
            'IsPE32Plus': int(is_pe32plus),
        }
    except Exception:
        pass
    return features


def extract_generic_features(data: bytes, filename: str) -> Dict:
    ext = os.path.splitext(filename)[1].lower()
    ext_map = {'.exe':1,'.dll':2,'.pdf':3,'.zip':4,'.doc':5,'.docx':6,
               '.xls':7,'.xlsx':8,'.js':9,'.vbs':10,'.bat':11,'.ps1':12,
               '.py':13,'.jar':14,'.apk':15,'.rar':16,'.7z':17,'.txt':18}

    # Analyze byte frequency over the first 10KB
    byte_freq = [0] * 256
    for b in data[:10000]:
        byte_freq[b] += 1
    total = sum(byte_freq) or 1

    # Check for common ransomware-related strings
    suspicious_strings = [
        b'encrypt', b'ransom', b'bitcoin', b'wallet',
        b'AES', b'RSA', b'CryptEncrypt', b'CryptGenKey',
        b'YOUR FILES', b'DECRYPT', b'.locked', b'.encrypted',
        b'Shadow', b'vssadmin', b'bcdedit', b'wbadmin'
    ]
    suspicious_count = sum(1 for s in suspicious_strings if s.lower() in data.lower())

    return {
        'FileSize': len(data),
        'Entropy': calculate_entropy(data),
        'ExtensionType': ext_map.get(ext, 0),
        'SuspiciousStringCount': suspicious_count,
        'NullByteRatio': round(byte_freq[0] / total, 4),
        'PrintableRatio': round(sum(byte_freq[i] for i in range(32, 127)) / total, 4),
        'HighByteRatio': round(sum(byte_freq[i] for i in range(128, 256)) / total, 4),
        'UniqueBytes': len([x for x in byte_freq if x > 0]),
        'MD5Hash': int(hashlib.md5(data).hexdigest()[:8], 16),
        'IsPE': int(data[:2] == b'MZ'),
        'IsPDF': int(data[:4] == b'%PDF'),
        'IsZIP': int(data[:2] in [b'PK', b'7z']),
        'IsOffice': int(data[:8] == b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'),
    }


def extract_features(file_data: bytes, filename: str) -> pd.DataFrame:
    """Extracts features from any file and returns a DataFrame."""
    features = extract_generic_features(file_data, filename)

    # For PE files (EXE/DLL/SYS), add additional PE header features
    if filename.lower().endswith(('.exe', '.dll', '.sys')):
        pe_feats = extract_pe_features(file_data)
        features.update(pe_feats)

    return pd.DataFrame([features])
