from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, Wallet
from app.services.common import utcnow


async def upsert_user(db: AsyncSession, tg_user: dict) -> User:
    """Telegram foydalanuvchisini topadi yoki yaratadi (hamyon bilan birga)."""
    telegram_id = int(tg_user["id"])
    username = tg_user.get("username")
    first_name = tg_user.get("first_name")
    last_name = tg_user.get("last_name")

    user = (await db.execute(select(User).where(User.telegram_id == telegram_id))).scalar_one_or_none()
    if user is None:
        try:
            async with db.begin_nested():
                user = User(telegram_id=telegram_id, username=username, first_name=first_name, last_name=last_name)
                db.add(user)
                await db.flush()
                db.add(Wallet(user_id=user.id, balance=0))
                await db.flush()
        except IntegrityError:  # bir vaqtda ikkita so'rov yaratib qo'ygan bo'lsa
            user = (await db.execute(select(User).where(User.telegram_id == telegram_id))).scalar_one()
    else:
        user.username = username
        user.first_name = first_name
        user.last_name = last_name
        user.last_login_at = utcnow()
    await db.commit()
    return user
