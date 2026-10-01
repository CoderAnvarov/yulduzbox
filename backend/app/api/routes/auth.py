from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models import User, Wallet
from app.schemas.api import MeOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me", response_model=MeOut)
async def me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    balance = (await db.execute(select(Wallet.balance).where(Wallet.user_id == user.id))).scalar_one()
    return MeOut(
        id=user.id,
        telegram_id=user.telegram_id,
        username=user.username,
        first_name=user.first_name,
        is_admin=user.telegram_id in settings.admin_ids,
        balance=balance,
    )
