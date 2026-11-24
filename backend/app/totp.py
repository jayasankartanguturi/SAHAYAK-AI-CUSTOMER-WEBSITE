import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote


def generate_totp_secret(length: int = 20) -> str:
    """Generates a Base32-encoded secret compatible with Google/Microsoft Authenticator."""
    raw = secrets.token_bytes(length)
    return base64.b32encode(raw).decode("ascii").rstrip("=")


def _totp_at(secret: str, counter: int, digits: int = 6) -> str:
    padded = secret.upper() + "=" * ((8 - len(secret) % 8) % 8)
    key = base64.b32decode(padded, casefold=True)
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code_int = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return str(code_int % (10**digits)).zfill(digits)


def verify_totp_code(secret: str, code: str, window: int = 1, period: int = 30) -> bool:
    """Verifies a 6-digit TOTP code allowing +/- 1 time step (30s) for clock skew."""
    clean = code.strip().replace(" ", "")
    if not clean.isdigit() or len(clean) != 6:
        return False
    now_counter = int(time.time() // period)
    for delta in range(-window, window + 1):
        if hmac.compare_digest(_totp_at(secret, now_counter + delta), clean):
            return True
    return False


def build_otpauth_uri(email: str, secret: str, issuer: str = "Sahayak AI") -> str:
    label = quote(f"{issuer}:{email}")
    return f"otpauth://totp/{label}?secret={secret}&issuer={quote(issuer)}&algorithm=SHA1&digits=6&period=30"
