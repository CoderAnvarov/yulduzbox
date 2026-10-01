import hashlib
import hmac
import json
import os
import time
from urllib.parse import urlencode

# --- Muhitni app import qilinishidan OLDIN sozlaymiz ---
os.environ["ENVIRONMENT"] = "test"
os.environ["BOT_TOKEN"] = "123456:TEST_TOKEN_FOR_TESTS"
os.environ["ADMIN_TELEGRAM_IDS"] = "1001"
os.environ["DEV_FAKE_USER_ID"] = ""
if os.environ.get("TEST_DATABASE_URL"):
    os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
import app.models as _models  # noqa: E402,F401


def make_init_data(user_id: int, auth_date: int | None = None, token: str | None = None) -> str:
    """Telegram initData ni xuddi Telegram kabi imzolaydi (testlar uchun)."""
    fields = {
        "auth_date": str(auth_date if auth_date is not None else int(time.time())),
        "query_id": "AAtest",
        "user": json.dumps({"id": user_id, "first_name": f"User{user_id}", "username": f"user{user_id}"}),
    }
    check = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
    secret = hmac.new(b"WebAppData", (token or settings.bot_token).encode(), hashlib.sha256).digest()
    fields["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(fields)


def auth(user_id: int) -> dict:
    return {"Authorization": f"tma {make_init_data(user_id)}"}


@pytest_asyncio.fixture(scope="session", autouse=True)
async def prepare_db():
    from sqlalchemy.engine import make_url

    db_name = make_url(settings.database_url).database or ""
    assert db_name.endswith("_test"), f"Xavfsizlik: test bazasi nomi '_test' bilan tugashi kerak (hozir: {db_name})"
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    from app.core.database import SessionLocal
    from app.models import Product

    async with SessionLocal() as db:
        db.add(Product(stars_amount=50, price_uzs=12500, sort_order=1))
        db.add(Product(stars_amount=100, price_uzs=25000, sort_order=2))
        await db.commit()
    yield
    await engine.dispose()


@pytest_asyncio.fixture(scope="session")
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture
def idem():
    import uuid

    return lambda: {"Idempotency-Key": uuid.uuid4().hex}
