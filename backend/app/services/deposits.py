from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import bad_request, conflict, not_found
from app.models import Deposit, User
from app.services.common import add_audit, get_setting, utcnow
from app.services.wallet import lock_wallet, post_transaction


async def create_deposit(db: AsyncSession, user: User, amount: int, reference: str, idem_key: str) -> tuple[Deposit, bool]:
    """(deposit, yangi_yaratildimi) qaytaradi. Bir xil idempotency key bilan qayta yuborilsa, eskisi qaytadi."""
    existing = (
        await db.execute(select(Deposit).where(Deposit.user_id == user.id, Deposit.idempotency_key == idem_key))
    ).scalar_one_or_none()
    if existing:
        return existing, False

    min_deposit = int(await get_setting(db, "min_deposit"))
    if amount < min_deposit:
        raise bad_request("amount_too_small", f"Minimal summa: {min_deposit} so'm")

    deposit = Deposit(user_id=user.id, amount=amount, reference=reference.strip(), idempotency_key=idem_key)
    db.add(deposit)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing = (
            await db.execute(select(Deposit).where(Deposit.user_id == user.id, Deposit.idempotency_key == idem_key))
        ).scalar_one()
        return existing, False
    return deposit, True


async def _lock_deposit(db: AsyncSession, deposit_id: int) -> Deposit:
    deposit = (
        await db.execute(select(Deposit).where(Deposit.id == deposit_id).with_for_update().execution_options(populate_existing=True))
    ).scalar_one_or_none()
    if deposit is None:
        raise not_found("Depozit topilmadi")
    if deposit.status != "pending":
        raise conflict("Bu so'rov allaqachon ko'rib chiqilgan")
    return deposit


async def approve_deposit(db: AsyncSession, deposit_id: int, admin_id: int) -> Deposit:
    """Depozitni tasdiqlaydi va balansni BIR MARTA oshiradi."""
    deposit = await _lock_deposit(db, deposit_id)
    wallet = await lock_wallet(db, deposit.user_id)
    await post_transaction(
        db,
        wallet,
        tx_type="deposit",
        amount=deposit.amount,
        idempotency_key=f"deposit:{deposit.id}:credit",
        deposit_id=deposit.id,
        actor_telegram_id=admin_id,
    )
    deposit.status = "approved"
    deposit.reviewed_by = admin_id
    deposit.reviewed_at = utcnow()
    add_audit(db, admin_id, "deposit.approve", "deposit", deposit.id, {"amount": deposit.amount})
    await db.commit()
    return deposit


async def reject_deposit(db: AsyncSession, deposit_id: int, admin_id: int, reason: str) -> Deposit:
    deposit = await _lock_deposit(db, deposit_id)
    deposit.status = "rejected"
    deposit.reject_reason = reason
    deposit.reviewed_by = admin_id
    deposit.reviewed_at = utcnow()
    add_audit(db, admin_id, "deposit.reject", "deposit", deposit.id, {"reason": reason})
    await db.commit()
    return deposit
