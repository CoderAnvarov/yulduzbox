from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AdminAuditLog, Setting

DEFAULT_SETTINGS = {
    "payment_details": "To'lov rekvizitlari hali kiritilmagan. Support bilan bog'laning: @AnvarovCoder",
    "min_deposit": "10000",
}


def utcnow() -> datetime:
    return datetime.now(UTC)


def add_audit(db: AsyncSession, admin_id: int, action: str, entity_type: str, entity_id: int | None, details: dict | None = None) -> None:
    db.add(AdminAuditLog(admin_telegram_id=admin_id, action=action, entity_type=entity_type, entity_id=entity_id, details=details))


async def get_setting(db: AsyncSession, key: str) -> str:
    row = (await db.execute(select(Setting).where(Setting.key == key))).scalar_one_or_none()
    return row.value if row else DEFAULT_SETTINGS[key]


async def set_setting(db: AsyncSession, key: str, value: str) -> None:
    row = (await db.execute(select(Setting).where(Setting.key == key))).scalar_one_or_none()
    if row:
        row.value = value
    else:
        db.add(Setting(key=key, value=value))
