from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.deps import require_admin
from app.bot.notify import notify_user
from app.core.database import get_db
from app.core.errors import not_found
from app.models import Deposit, Order, Product, User, Wallet
from app.schemas.api import (
    AdminDepositOut,
    AdminOrderOut,
    AdminUserOut,
    DashboardOut,
    DepositOut,
    OrderOut,
    Page,
    ProductOut,
    ProductPatch,
    PublicSettings,
    ReasonBody,
    SettingsPatch,
)
from app.services import deposits as deposit_svc
from app.services import orders as order_svc
from app.services.common import add_audit, get_setting, set_setting

# Barcha admin yo'llari server tomonda require_admin bilan himoyalangan
router = APIRouter(prefix="/api/admin", tags=["admin"])


async def _tg(db: AsyncSession, user_id: int) -> int:
    return (await db.execute(select(User.telegram_id).where(User.id == user_id))).scalar_one()


# ---------- Dashboard ----------
@router.get("/dashboard", response_model=DashboardOut)
async def dashboard(_: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    async def scalar(q):
        return (await db.execute(q)).scalar_one() or 0

    return DashboardOut(
        users=await scalar(select(func.count(User.id))),
        pending_deposits=await scalar(select(func.count(Deposit.id)).where(Deposit.status == "pending")),
        pending_orders=await scalar(select(func.count(Order.id)).where(Order.status == "pending_admin")),
        approved_deposits_sum=await scalar(select(func.sum(Deposit.amount)).where(Deposit.status == "approved")),
        completed_orders=await scalar(select(func.count(Order.id)).where(Order.status == "completed")),
        completed_revenue=await scalar(select(func.sum(Order.price_uzs)).where(Order.status == "completed")),
        total_balances=await scalar(select(func.sum(Wallet.balance))),
    )


# ---------- Deposits ----------
@router.get("/deposits", response_model=Page[AdminDepositOut])
async def list_deposits(
    status: str | None = Query(None, pattern="^(pending|approved|rejected)$"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    base = select(Deposit)
    if status:
        base = base.where(Deposit.status == status)
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    q = base.options(joinedload(Deposit.user)).order_by(Deposit.id.desc()).limit(limit).offset(offset)
    return Page(items=(await db.execute(q)).scalars().all(), total=total)


@router.post("/deposits/{deposit_id}/approve", response_model=DepositOut)
async def approve_deposit(
    deposit_id: int, background: BackgroundTasks, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    deposit = await deposit_svc.approve_deposit(db, deposit_id, admin.telegram_id)
    background.add_task(notify_user, await _tg(db, deposit.user_id), f"✅ Balans so'rovingiz #{deposit.id} tasdiqlandi.\n+{deposit.amount} so'm hisobingizga qo'shildi.")
    return deposit


@router.post("/deposits/{deposit_id}/reject", response_model=DepositOut)
async def reject_deposit(
    deposit_id: int, body: ReasonBody, background: BackgroundTasks, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    deposit = await deposit_svc.reject_deposit(db, deposit_id, admin.telegram_id, body.reason)
    background.add_task(notify_user, await _tg(db, deposit.user_id), f"❌ Balans so'rovingiz #{deposit.id} rad etildi.\nSabab: {body.reason}")
    return deposit


# ---------- Orders ----------
@router.get("/orders", response_model=Page[AdminOrderOut])
async def list_orders(
    status: str | None = Query(None, pattern="^(pending_admin|approved|processing|completed|rejected|refunded|failed)$"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    base = select(Order)
    if status:
        base = base.where(Order.status == status)
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    q = base.options(joinedload(Order.user)).order_by(Order.id.desc()).limit(limit).offset(offset)
    return Page(items=(await db.execute(q)).scalars().all(), total=total)


@router.post("/orders/{order_id}/approve", response_model=OrderOut)
async def approve_order(
    order_id: int, background: BackgroundTasks, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    order = await order_svc.approve_order(db, order_id, admin.telegram_id)
    background.add_task(notify_user, await _tg(db, order.user_id), f"👍 Buyurtma #{order.id} tasdiqlandi va bajarilmoqda.")
    return order


@router.post("/orders/{order_id}/complete", response_model=OrderOut)
async def complete_order(
    order_id: int, background: BackgroundTasks, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    order = await order_svc.complete_order(db, order_id, admin.telegram_id)
    background.add_task(notify_user, await _tg(db, order.user_id), f"🎉 Buyurtma #{order.id} bajarildi!\n{order.stars_amount} Stars @{order.recipient_username} ga yetkazildi.")
    return order


@router.post("/orders/{order_id}/reject", response_model=OrderOut)
async def reject_order(
    order_id: int, body: ReasonBody, background: BackgroundTasks, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    order = await order_svc.reject_order(db, order_id, admin.telegram_id, body.reason)
    background.add_task(notify_user, await _tg(db, order.user_id), f"❌ Buyurtma #{order.id} rad etildi. {order.price_uzs} so'm balansingizga qaytarildi.\nSabab: {body.reason}")
    return order


@router.post("/orders/{order_id}/fail", response_model=OrderOut)
async def fail_order(
    order_id: int, body: ReasonBody, background: BackgroundTasks, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    order = await order_svc.fail_order(db, order_id, admin.telegram_id, body.reason)
    background.add_task(notify_user, await _tg(db, order.user_id), f"⚠️ Buyurtma #{order.id} bajarilmadi. {order.price_uzs} so'm balansingizga qaytarildi.\nSabab: {body.reason}")
    return order


# ---------- Users ----------
@router.get("/users", response_model=Page[AdminUserOut])
async def list_users(
    q: str | None = Query(None, max_length=64),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    base = select(User, Wallet.balance).join(Wallet, Wallet.user_id == User.id)
    if q:
        like = f"%{q.strip().lstrip('@')}%"
        cond = or_(User.username.ilike(like), User.first_name.ilike(like))
        if q.strip().isdigit():
            cond = or_(cond, User.telegram_id == int(q.strip()))
        base = base.where(cond)
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    rows = (await db.execute(base.order_by(User.id.desc()).limit(limit).offset(offset))).all()
    items = [
        AdminUserOut(
            id=u.id, telegram_id=u.telegram_id, username=u.username, first_name=u.first_name,
            is_blocked=u.is_blocked, balance=bal, created_at=u.created_at,
        )
        for u, bal in rows
    ]
    return Page(items=items, total=total)


# ---------- Products ----------
@router.get("/products", response_model=list[ProductOut])
async def admin_products(_: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    return (await db.execute(select(Product).order_by(Product.sort_order, Product.stars_amount))).scalars().all()


@router.patch("/products/{product_id}", response_model=ProductOut)
async def patch_product(
    product_id: int, body: ProductPatch, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    product = (await db.execute(select(Product).where(Product.id == product_id).with_for_update())).scalar_one_or_none()
    if product is None:
        raise not_found("Paket topilmadi")
    changes = body.model_dump(exclude_none=True)
    for key, value in changes.items():
        setattr(product, key, value)
    add_audit(db, admin.telegram_id, "product.update", "product", product.id, changes)
    await db.commit()
    return product


# ---------- Settings ----------
@router.get("/settings", response_model=PublicSettings)
async def get_settings_admin(_: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    return PublicSettings(
        payment_details=await get_setting(db, "payment_details"),
        min_deposit=int(await get_setting(db, "min_deposit")),
    )


@router.patch("/settings", response_model=PublicSettings)
async def patch_settings(body: SettingsPatch, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    changes = body.model_dump(exclude_none=True)
    for key, value in changes.items():
        await set_setting(db, key, str(value))
    add_audit(db, admin.telegram_id, "settings.update", "settings", None, changes)
    await db.commit()
    return PublicSettings(
        payment_details=await get_setting(db, "payment_details"),
        min_deposit=int(await get_setting(db, "min_deposit")),
    )
