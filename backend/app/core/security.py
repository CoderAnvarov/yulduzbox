import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl

from app.core.errors import AppError


def _unauthorized(message: str = "Telegram orqali qayta kiring") -> AppError:
    return AppError(401, "unauthorized", message)


def validate_init_data(init_data: str, bot_token: str, max_age_seconds: int) -> dict:
    """
    Telegram initData ni rasmiy HMAC-SHA256 usuli bilan tekshiradi.
    Muvaffaqiyatli bo'lsa Telegram foydalanuvchi ma'lumotini (dict) qaytaradi.
    """
    if not init_data:
        raise _unauthorized()

    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise _unauthorized()

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(calculated, received_hash):
        raise _unauthorized()

    try:
        auth_date = int(pairs.get("auth_date", "0"))
    except ValueError:
        raise _unauthorized()
    if auth_date <= 0 or time.time() - auth_date > max_age_seconds:
        raise _unauthorized("Sessiya eskirdi. Mini App'ni qayta oching")

    try:
        user = json.loads(pairs.get("user", ""))
        int(user["id"])
    except (ValueError, KeyError, TypeError):
        raise _unauthorized()
    return user
