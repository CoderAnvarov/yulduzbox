from fastapi import Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.errors import AppError
from app.core.security import validate_init_data
from app.models import User
from app.services.users import upsert_user


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    header = request.headers.get("Authorization", "")
    if header.startswith("tma "):
        tg_user = validate_init_data(header[4:], settings.bot_token, settings.initdata_max_age_seconds)
    elif settings.dev_fake_user_id.strip() and settings.environment == "development":
        # Faqat lokal rivojlanish uchun. Productionda hech qachon ishlamaydi.
        tg_user = {"id": int(settings.dev_fake_user_id), "first_name": "Dev", "username": "dev_user"}
    else:
        raise AppError(401, "unauthorized", "Mini App'ni Telegram ichida oching")

    user = await upsert_user(db, tg_user)
    if user.is_blocked:
        raise AppError(403, "blocked", "Akkauntingiz bloklangan")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.telegram_id not in settings.admin_ids:
        raise AppError(403, "forbidden", "Ruxsat yo'q")
    return user


async def idempotency_key(key: str | None = Header(default=None, alias="Idempotency-Key")) -> str:
    if not key or not (8 <= len(key) <= 64):
        raise AppError(400, "idempotency_key_required", "Idempotency-Key sarlavhasi (8-64 belgi) kerak")
    return key
