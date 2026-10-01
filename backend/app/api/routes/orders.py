from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, idempotency_key
from app.bot.notify import notify_admins
from app.core.database import get_db
from app.core.errors import not_found
from app.core.limiter import limiter
from app.models import Order, User
from app.schemas.api import OrderCreate, OrderOut, Page
from app.services.orders import create_order

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("", response_model=OrderOut, status_code=201)
@limiter.limit("10/minute")
async def create_order_endpoint(
    request: Request,
    response: Response,
    body: OrderCreate,
    background: BackgroundTasks,
    idem: str = Depends(idempotency_key),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order, created = await create_order(db, user, body.product_id, body.recipient_username, idem)
    if created:
        background.add_task(
            notify_admins,
            f"⭐ Yangi buyurtma #{order.id}\n{order.stars_amount} Stars → @{order.recipient_username}\nNarx: {order.price_uzs} so'm",
        )
    else:
        response.status_code = 200
    return order


@router.get("", response_model=Page[OrderOut])
async def list_orders(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base = select(Order).where(Order.user_id == user.id)
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    rows = (await db.execute(base.order_by(Order.id.desc()).limit(limit).offset(offset))).scalars().all()
    return Page(items=rows, total=total)


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    order = (await db.execute(select(Order).where(Order.id == order_id, Order.user_id == user.id))).scalar_one_or_none()
    if order is None:  # boshqa odamning buyurtmasi ham "topilmadi" deb ko'rinadi
        raise not_found("Buyurtma topilmadi")
    return order
