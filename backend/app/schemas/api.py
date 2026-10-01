from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int


class UserBrief(ORM):
    id: int
    telegram_id: int
    username: str | None
    first_name: str | None


class MeOut(BaseModel):
    id: int
    telegram_id: int
    username: str | None
    first_name: str | None
    is_admin: bool
    balance: int


class WalletOut(BaseModel):
    balance: int


class TransactionOut(ORM):
    id: int
    type: str
    amount: int
    balance_after: int
    deposit_id: int | None
    order_id: int | None
    created_at: datetime


class DepositCreate(BaseModel):
    amount: int = Field(gt=0, le=1_000_000_000)
    reference: str = Field(min_length=3, max_length=200)


class DepositOut(ORM):
    id: int
    amount: int
    reference: str
    status: str
    reject_reason: str | None
    created_at: datetime
    reviewed_at: datetime | None


class AdminDepositOut(DepositOut):
    user: UserBrief


class ProductOut(ORM):
    id: int
    stars_amount: int
    price_uzs: int
    is_active: bool
    sort_order: int


class ProductPatch(BaseModel):
    price_uzs: int | None = Field(default=None, gt=0, le=1_000_000_000)
    is_active: bool | None = None
    sort_order: int | None = Field(default=None, ge=0, le=10_000)


class OrderCreate(BaseModel):
    product_id: int
    recipient_username: str = Field(min_length=1, max_length=64)


class OrderOut(ORM):
    id: int
    product_id: int
    stars_amount: int
    price_uzs: int
    recipient_username: str
    status: str
    admin_note: str | None
    refunded_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AdminOrderOut(OrderOut):
    user: UserBrief


class ReasonBody(BaseModel):
    reason: str = Field(min_length=3, max_length=300)


class AdminUserOut(BaseModel):
    id: int
    telegram_id: int
    username: str | None
    first_name: str | None
    is_blocked: bool
    balance: int
    created_at: datetime


class PublicSettings(BaseModel):
    payment_details: str
    min_deposit: int


class SettingsPatch(BaseModel):
    payment_details: str | None = Field(default=None, max_length=1000)
    min_deposit: int | None = Field(default=None, ge=1000, le=100_000_000)


class DashboardOut(BaseModel):
    users: int
    pending_deposits: int
    pending_orders: int
    approved_deposits_sum: int
    completed_orders: int
    completed_revenue: int
    total_balances: int
