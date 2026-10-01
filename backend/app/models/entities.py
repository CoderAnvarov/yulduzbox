from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

# ---- Holatlar ----
DEPOSIT_STATUSES = ("pending", "approved", "rejected")
ORDER_STATUSES = ("pending_admin", "approved", "processing", "completed", "rejected", "refunded", "failed")
TX_TYPES = ("deposit", "order_debit", "order_refund")


def _in(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


def _created() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


def _updated() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False)
    username: Mapped[str | None] = mapped_column(String(64))
    first_name: Mapped[str | None] = mapped_column(String(128))
    last_name: Mapped[str | None] = mapped_column(String(128))
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"), nullable=False)
    created_at: Mapped[datetime] = _created()
    last_login_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Wallet(Base):
    __tablename__ = "wallets"
    __table_args__ = (CheckConstraint("balance >= 0", name="balance_non_negative"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    # so'mda, butun son (minor unit = 1 so'm)
    balance: Mapped[int] = mapped_column(BigInteger, default=0, server_default=text("0"), nullable=False)
    updated_at: Mapped[datetime] = _updated()


class Deposit(Base):
    __tablename__ = "deposits"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        CheckConstraint(_in("status", DEPOSIT_STATUSES), name="status_valid"),
        UniqueConstraint("user_id", "idempotency_key", name="uq_deposits_user_idempotency"),
        Index("ix_deposits_status_created", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reference: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="pending", server_default="pending", nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(64), nullable=False)
    reject_reason: Mapped[str | None] = mapped_column(String(300))
    reviewed_by: Mapped[int | None] = mapped_column(BigInteger)  # admin telegram_id
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created()

    user: Mapped[User] = relationship()


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("stars_amount > 0", name="stars_positive"),
        CheckConstraint("price_uzs > 0", name="price_positive"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    stars_amount: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False)
    price_uzs: Mapped[int] = mapped_column(BigInteger, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"), nullable=False)
    sort_order: Mapped[int] = mapped_column(BigInteger, default=0, server_default=text("0"), nullable=False)
    updated_at: Mapped[datetime] = _updated()


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("price_uzs > 0", name="price_positive"),
        CheckConstraint(_in("status", ORDER_STATUSES), name="status_valid"),
        UniqueConstraint("user_id", "idempotency_key", name="uq_orders_user_idempotency"),
        Index("ix_orders_status_created", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    # Buyurtma paytidagi narx va miqdor (keyin narx o'zgarsa ham buyurtma o'zgarmaydi)
    stars_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    price_uzs: Mapped[int] = mapped_column(BigInteger, nullable=False)
    recipient_username: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="pending_admin", server_default="pending_admin", nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(64), nullable=False)
    admin_note: Mapped[str | None] = mapped_column(String(300))
    processed_by: Mapped[int | None] = mapped_column(BigInteger)
    refunded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()

    user: Mapped[User] = relationship()


class Transaction(Base):
    """O'zgarmas hamyon jurnali (ledger). Hech qachon o'chirilmaydi va tahrirlanmaydi."""

    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("amount <> 0", name="amount_non_zero"),
        CheckConstraint("balance_after >= 0", name="balance_after_non_negative"),
        CheckConstraint(_in("type", TX_TYPES), name="type_valid"),
        UniqueConstraint("idempotency_key", name="uq_transactions_idempotency_key"),
        # Bitta depozit / buyurtma uchun har turdagi yozuv faqat BIR marta bo'lishi mumkin
        Index("uq_transactions_deposit_type", "deposit_id", "type", unique=True, postgresql_where=text("deposit_id IS NOT NULL")),
        Index("uq_transactions_order_type", "order_id", "type", unique=True, postgresql_where=text("order_id IS NOT NULL")),
        Index("ix_transactions_user_created", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    wallet_id: Mapped[int] = mapped_column(ForeignKey("wallets.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)  # + kirim, - chiqim
    balance_after: Mapped[int] = mapped_column(BigInteger, nullable=False)
    deposit_id: Mapped[int | None] = mapped_column(ForeignKey("deposits.id"))
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"))
    idempotency_key: Mapped[str] = mapped_column(String(80), nullable=False)
    actor_telegram_id: Mapped[int | None] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = _created()


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = _updated()


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"
    __table_args__ = (Index("ix_admin_audit_logs_created", "created_at"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    admin_telegram_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    entity_id: Mapped[int | None] = mapped_column(BigInteger)
    details: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = _created()
