from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, bad_request
from app.models import Transaction, Wallet


async def lock_wallet(db: AsyncSession, user_id: int) -> Wallet:
    """Hamyon qatorini qulflaydi (SELECT ... FOR UPDATE). Bir vaqtdagi o'zgarishlar navbat bilan bajariladi."""
    result = await db.execute(
        select(Wallet).where(Wallet.user_id == user_id).with_for_update().execution_options(populate_existing=True)
    )
    wallet = result.scalar_one_or_none()
    if wallet is None:
        raise AppError(500, "wallet_missing", "Hamyon topilmadi")
    return wallet


async def post_transaction(
    db: AsyncSession,
    wallet: Wallet,
    *,
    tx_type: str,
    amount: int,
    idempotency_key: str,
    deposit_id: int | None = None,
    order_id: int | None = None,
    actor_telegram_id: int | None = None,
) -> Transaction:
    """Balansni o'zgartirishning YAGONA yo'li. Har o'zgarish jurnalga yoziladi."""
    new_balance = wallet.balance + amount
    if new_balance < 0:
        raise bad_request("insufficient_funds", "Balansingizda mablag' yetarli emas")
    wallet.balance = new_balance
    tx = Transaction(
        user_id=wallet.user_id,
        wallet_id=wallet.id,
        type=tx_type,
        amount=amount,
        balance_after=new_balance,
        deposit_id=deposit_id,
        order_id=order_id,
        idempotency_key=idempotency_key,
        actor_telegram_id=actor_telegram_id,
    )
    db.add(tx)
    await db.flush()
    return tx
