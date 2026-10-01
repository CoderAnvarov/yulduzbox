from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Product, User
from app.schemas.api import ProductOut, PublicSettings
from app.services.common import get_setting

router = APIRouter(prefix="/api", tags=["products"])


@router.get("/products", response_model=list[ProductOut])
async def list_products(_: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    q = select(Product).where(Product.is_active.is_(True)).order_by(Product.sort_order, Product.stars_amount)
    return (await db.execute(q)).scalars().all()


@router.get("/settings/public", response_model=PublicSettings)
async def public_settings(_: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return PublicSettings(
        payment_details=await get_setting(db, "payment_details"),
        min_deposit=int(await get_setting(db, "min_deposit")),
    )
