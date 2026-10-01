from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, idempotency_key
from app.bot.notify import notify_admins
from app.core.database import get_db
from app.core.limiter import limiter
from app.models import Deposit, Transaction, User, Wallet
from app.schemas.api import DepositCreate, DepositOut, Page, TransactionOut, WalletOut
from app.services.deposits import create_deposit

router = APIRouter(prefix="/api/wallet", tags=["wallet"])


@router.get("", response_model=WalletOut)
async def get_wallet(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    balance = (await db.execute(select(Wallet.balance).where(Wallet.user_id == user.id))).scalar_one()
    return WalletOut(balance=balance)


@router.get("/history", response_model=Page[TransactionOut])
async def history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base = select(Transaction).where(Transaction.user_id == user.id)
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    rows = (await db.execute(base.order_by(Transaction.id.desc()).limit(limit).offset(offset))).scalars().all()
    return Page(items=rows, total=total)


@router.get("/deposits", response_model=Page[DepositOut])
async def my_deposits(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base = select(Deposit).where(Deposit.user_id == user.id)
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    rows = (await db.execute(base.order_by(Deposit.id.desc()).limit(limit).offset(offset))).scalars().all()
    return Page(items=rows, total=total)


@router.post("/deposits", response_model=DepositOut, status_code=201)
@limiter.limit("10/minute")
async def create_deposit_request(
    request: Request,
    response: Response,
    body: DepositCreate,
    background: BackgroundTasks,
    idem: str = Depends(idempotency_key),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deposit, created = await create_deposit(db, user, body.amount, body.reference, idem)
    if created:
        background.add_task(
            notify_admins,
            f"💰 Yangi balans so'rovi #{deposit.id}\nSumma: {deposit.amount} so'm\nFoydalanuvchi: {user.first_name or ''} (@{user.username or '-'})",
        )
    else:
        response.status_code = 200
    return deposit
