import re

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import bad_request, conflict, not_found
from app.models import Order, Product, User
from app.providers.manual import provider
from app.services.common import add_audit, utcnow
from app.services.wallet import lock_wallet, post_transaction

USERNAME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]{4,31}$")

# Ruxsat etilgan holat o'tishlari
TRANSITIONS: dict[str, set[str]] = {
    "pending_admin": {"approved", "rejected"},
    "approved": {"processing", "completed", "rejected", "failed"},
    "processing": {"completed", "failed"},
    "completed": set(),
    "rejected": set(),
    "failed": set(),
    "refunded": set(),
}


def normalize_username(raw: str) -> str:
    value = raw.strip().removeprefix("@")
    if not USERNAME_RE.match(value):
        raise bad_request("invalid_username", "Username noto'g'ri. 5-32 belgi: lotin harflari, raqam va _")
    return value


async def create_order(db: AsyncSession, user: User, product_id: int, recipient_raw: str, idem_key: str) -> tuple[Order, bool]:
    existing = (
        await db.execute(select(Order).where(Order.user_id == user.id, Order.idempotency_key == idem_key))
    ).scalar_one_or_none()
    if existing:
        return existing, False

    recipient = normalize_username(recipient_raw)
    product = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
    if product is None or not product.is_active:
        raise bad_request("product_unavailable", "Bu paket hozir mavjud emas")

    # Narx FAQAT serverda, bazadan olinadi
    wallet = await lock_wallet(db, user.id)
    if wallet.balance < product.price_uzs:
        raise bad_request("insufficient_funds", "Balansingizda mablag' yetarli emas")

    order = Order(
        user_id=user.id,
        product_id=product.id,
        stars_amount=product.stars_amount,
        price_uzs=product.price_uzs,
        recipient_username=recipient,
        idempotency_key=idem_key,
    )
    db.add(order)
    try:
        await db.flush()
        await post_transaction(
            db, wallet, tx_type="order_debit", amount=-order.price_uzs,
            idempotency_key=f"order:{order.id}:debit", order_id=order.id,
        )
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing = (
            await db.execute(select(Order).where(Order.user_id == user.id, Order.idempotency_key == idem_key))
        ).scalar_one()
        return existing, False
    return order, True


async def _lock_order(db: AsyncSession, order_id: int, target: str) -> Order:
    order = (
        await db.execute(select(Order).where(Order.id == order_id).with_for_update().execution_options(populate_existing=True))
    ).scalar_one_or_none()
    if order is None:
        raise not_found("Buyurtma topilmadi")
    if target not in TRANSITIONS[order.status]:
        raise conflict(f"Buyurtmani '{order.status}' holatidan '{target}' holatiga o'tkazib bo'lmaydi")
    return order


async def _refund(db: AsyncSession, order: Order, admin_id: int) -> None:
    """Pulni aniq BIR marta qaytaradi (buyurtma qulflangan + ledger'da unikal indeks bor)."""
    wallet = await lock_wallet(db, order.user_id)
    await post_transaction(
        db, wallet, tx_type="order_refund", amount=order.price_uzs,
        idempotency_key=f"order:{order.id}:refund", order_id=order.id, actor_telegram_id=admin_id,
    )
    order.refunded_at = utcnow()


async def approve_order(db: AsyncSession, order_id: int, admin_id: int) -> Order:
    order = await _lock_order(db, order_id, "approved")
    await provider.submit_order(order.id, order.recipient_username, order.stars_amount)  # hozir: qo'lda
    order.status = "approved"
    order.processed_by = admin_id
    add_audit(db, admin_id, "order.approve", "order", order.id)
    await db.commit()
    await db.refresh(order)
    return order


async def complete_order(db: AsyncSession, order_id: int, admin_id: int) -> Order:
    order = await _lock_order(db, order_id, "completed")
    order.status = "completed"
    order.processed_by = admin_id
    add_audit(db, admin_id, "order.complete", "order", order.id)
    await db.commit()
    await db.refresh(order)
    return order


async def reject_order(db: AsyncSession, order_id: int, admin_id: int, reason: str) -> Order:
    order = await _lock_order(db, order_id, "rejected")
    await _refund(db, order, admin_id)
    order.status = "rejected"
    order.admin_note = reason
    order.processed_by = admin_id
    add_audit(db, admin_id, "order.reject", "order", order.id, {"reason": reason})
    await db.commit()
    await db.refresh(order)
    return order


async def fail_order(db: AsyncSession, order_id: int, admin_id: int, reason: str) -> Order:
    order = await _lock_order(db, order_id, "failed")
    await _refund(db, order, admin_id)
    order.status = "failed"
    order.admin_note = reason
    order.processed_by = admin_id
    add_audit(db, admin_id, "order.fail", "order", order.id, {"reason": reason})
    await db.commit()
    await db.refresh(order)
    return order
