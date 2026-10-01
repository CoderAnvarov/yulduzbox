import asyncio
import time

import pytest
from sqlalchemy import func, select

from app.core.database import SessionLocal
from app.core.errors import AppError
from app.core.security import validate_init_data
from app.models import Transaction, Wallet
from tests.conftest import auth, make_init_data

ADMIN = 1001


async def balance(client, uid):
    return (await client.get("/api/wallet", headers=auth(uid))).json()["balance"]


async def fund(client, uid, amount, idem):
    """Depozit yaratib, admin orqali tasdiqlaydi."""
    r = await client.post("/api/wallet/deposits", json={"amount": amount, "reference": "test-ref"}, headers={**auth(uid), **idem()})
    assert r.status_code == 201, r.text
    dep_id = r.json()["id"]
    r = await client.post(f"/api/admin/deposits/{dep_id}/approve", headers=auth(ADMIN))
    assert r.status_code == 200, r.text
    return dep_id


# ---------- Telegram autentifikatsiya ----------
def test_init_data_valid():
    user = validate_init_data(make_init_data(555), "123456:TEST_TOKEN_FOR_TESTS", 3600)
    assert user["id"] == 555


def test_init_data_wrong_token_rejected():
    with pytest.raises(AppError):
        validate_init_data(make_init_data(555, token="999:OTHER"), "123456:TEST_TOKEN_FOR_TESTS", 3600)


def test_init_data_expired_rejected():
    old = int(time.time()) - 100000
    with pytest.raises(AppError):
        validate_init_data(make_init_data(555, auth_date=old), "123456:TEST_TOKEN_FOR_TESTS", 3600)


def test_init_data_tampered_rejected():
    tampered = make_init_data(555).replace("User555", "Hacker")
    with pytest.raises(AppError):
        validate_init_data(tampered, "123456:TEST_TOKEN_FOR_TESTS", 3600)


async def test_me_requires_auth(client):
    assert (await client.get("/api/auth/me")).status_code == 401
    assert (await client.get("/api/auth/me", headers={"Authorization": "tma garbage"})).status_code == 401


async def test_me_ok_and_admin_flag(client):
    r = await client.get("/api/auth/me", headers=auth(2001))
    assert r.status_code == 200
    assert r.json()["balance"] == 0 and r.json()["is_admin"] is False
    assert (await client.get("/api/auth/me", headers=auth(ADMIN))).json()["is_admin"] is True


# ---------- Admin huquqi ----------
async def test_admin_endpoints_forbidden_for_users(client):
    for path in ("/api/admin/dashboard", "/api/admin/deposits", "/api/admin/orders", "/api/admin/users", "/api/admin/products"):
        assert (await client.get(path, headers=auth(2002))).status_code == 403
    assert (await client.post("/api/admin/deposits/1/approve", headers=auth(2002))).status_code == 403


# ---------- Depozit ----------
async def test_deposit_idempotent_and_single_credit(client, idem):
    key = idem()
    h = {**auth(3001), **key}
    r1 = await client.post("/api/wallet/deposits", json={"amount": 50000, "reference": "chek-1"}, headers=h)
    r2 = await client.post("/api/wallet/deposits", json={"amount": 50000, "reference": "chek-1"}, headers=h)
    assert r1.status_code == 201 and r2.status_code == 200
    assert r1.json()["id"] == r2.json()["id"]

    dep_id = r1.json()["id"]
    assert (await client.post(f"/api/admin/deposits/{dep_id}/approve", headers=auth(ADMIN))).status_code == 200
    assert (await client.post(f"/api/admin/deposits/{dep_id}/approve", headers=auth(ADMIN))).status_code == 409
    assert (await client.post(f"/api/admin/deposits/{dep_id}/reject", json={"reason": "kech"}, headers=auth(ADMIN))).status_code == 409
    assert await balance(client, 3001) == 50000


async def test_concurrent_deposit_approval_credits_once(client, idem):
    r = await client.post("/api/wallet/deposits", json={"amount": 40000, "reference": "chek-2"}, headers={**auth(3002), **idem()})
    dep_id = r.json()["id"]
    results = await asyncio.gather(*[client.post(f"/api/admin/deposits/{dep_id}/approve", headers=auth(ADMIN)) for _ in range(8)])
    codes = sorted(x.status_code for x in results)
    assert codes.count(200) == 1 and codes.count(409) == 7
    assert await balance(client, 3002) == 40000


async def test_deposit_validation(client, idem):
    h = {**auth(3003), **idem()}
    assert (await client.post("/api/wallet/deposits", json={"amount": 100, "reference": "chek"}, headers=h)).status_code == 400  # minimaldan kam
    assert (await client.post("/api/wallet/deposits", json={"amount": -5, "reference": "chek"}, headers=h)).status_code == 422
    assert (await client.post("/api/wallet/deposits", json={"amount": 20000, "reference": "chek"}, headers=auth(3003))).status_code == 400  # Idempotency-Key yo'q


async def test_deposit_reject_does_not_credit(client, idem):
    r = await client.post("/api/wallet/deposits", json={"amount": 30000, "reference": "soxta"}, headers={**auth(3004), **idem()})
    dep_id = r.json()["id"]
    assert (await client.post(f"/api/admin/deposits/{dep_id}/reject", json={"reason": "to'lov topilmadi"}, headers=auth(ADMIN))).status_code == 200
    assert await balance(client, 3004) == 0


# ---------- Buyurtma ----------
async def test_order_requires_funds(client, idem):
    r = await client.post("/api/orders", json={"product_id": 1, "recipient_username": "@some_user"}, headers={**auth(4001), **idem()})
    assert r.status_code == 400 and r.json()["code"] == "insufficient_funds"


async def test_order_username_validation(client, idem):
    await fund(client, 4002, 50000, idem)
    for bad in ("ab", "1abcde", "has space", "a" * 40, "тест_user"):
        r = await client.post("/api/orders", json={"product_id": 1, "recipient_username": bad}, headers={**auth(4002), **idem()})
        assert r.status_code == 400, bad
    assert await balance(client, 4002) == 50000


async def test_order_reject_refunds_exactly_once(client, idem):
    await fund(client, 4003, 30000, idem)
    r = await client.post("/api/orders", json={"product_id": 1, "recipient_username": "@Friend_One"}, headers={**auth(4003), **idem()})
    assert r.status_code == 201
    order = r.json()
    assert order["price_uzs"] == 12500 and order["stars_amount"] == 50 and order["recipient_username"] == "Friend_One"
    assert await balance(client, 4003) == 30000 - 12500

    ok = await client.post(f"/api/admin/orders/{order['id']}/reject", json={"reason": "username xato"}, headers=auth(ADMIN))
    assert ok.status_code == 200 and ok.json()["refunded_at"] is not None
    assert await balance(client, 4003) == 30000
    # qayta rad etish / fail / complete — hammasi 409, ikkinchi qaytarish bo'lmaydi
    assert (await client.post(f"/api/admin/orders/{order['id']}/reject", json={"reason": "yana"}, headers=auth(ADMIN))).status_code == 409
    assert (await client.post(f"/api/admin/orders/{order['id']}/fail", json={"reason": "yana"}, headers=auth(ADMIN))).status_code == 409
    assert (await client.post(f"/api/admin/orders/{order['id']}/complete", headers=auth(ADMIN))).status_code == 409
    assert await balance(client, 4003) == 30000


async def test_concurrent_reject_refunds_once(client, idem):
    await fund(client, 4004, 12500, idem)
    order = (await client.post("/api/orders", json={"product_id": 1, "recipient_username": "friend_two"}, headers={**auth(4004), **idem()})).json()
    results = await asyncio.gather(
        *[client.post(f"/api/admin/orders/{order['id']}/reject", json={"reason": "parallel"}, headers=auth(ADMIN)) for _ in range(6)]
    )
    assert sorted(x.status_code for x in results).count(200) == 1
    assert await balance(client, 4004) == 12500


async def test_order_complete_flow_and_no_refund_after(client, idem):
    await fund(client, 4005, 25000, idem)
    order = (await client.post("/api/orders", json={"product_id": 2, "recipient_username": "friend_three"}, headers={**auth(4005), **idem()})).json()
    oid = order["id"]
    assert (await client.post(f"/api/admin/orders/{oid}/complete", headers=auth(ADMIN))).status_code == 409  # tasdiqlanmagan
    assert (await client.post(f"/api/admin/orders/{oid}/approve", headers=auth(ADMIN))).json()["status"] == "approved"
    assert (await client.post(f"/api/admin/orders/{oid}/approve", headers=auth(ADMIN))).status_code == 409
    assert (await client.post(f"/api/admin/orders/{oid}/complete", headers=auth(ADMIN))).json()["status"] == "completed"
    assert (await client.post(f"/api/admin/orders/{oid}/fail", json={"reason": "kech"}, headers=auth(ADMIN))).status_code == 409
    assert await balance(client, 4005) == 0


async def test_order_fail_after_approve_refunds(client, idem):
    await fund(client, 4006, 25000, idem)
    oid = (await client.post("/api/orders", json={"product_id": 2, "recipient_username": "friend_four"}, headers={**auth(4006), **idem()})).json()["id"]
    await client.post(f"/api/admin/orders/{oid}/approve", headers=auth(ADMIN))
    r = await client.post(f"/api/admin/orders/{oid}/fail", json={"reason": "yetkazib bo'lmadi"}, headers=auth(ADMIN))
    assert r.json()["status"] == "failed"
    assert await balance(client, 4006) == 25000


async def test_concurrent_orders_cannot_overspend(client, idem):
    await fund(client, 4007, 12500, idem)  # faqat bitta 50-Stars paketiga yetadi
    results = await asyncio.gather(
        *[client.post("/api/orders", json={"product_id": 1, "recipient_username": "friend_five"}, headers={**auth(4007), **idem()}) for _ in range(5)]
    )
    codes = sorted(x.status_code for x in results)
    assert codes.count(201) == 1 and codes.count(400) == 4
    assert await balance(client, 4007) == 0


async def test_order_idempotent(client, idem):
    await fund(client, 4008, 50000, idem)
    h = {**auth(4008), **idem()}
    a = await client.post("/api/orders", json={"product_id": 1, "recipient_username": "friend_six"}, headers=h)
    b = await client.post("/api/orders", json={"product_id": 1, "recipient_username": "friend_six"}, headers=h)
    assert a.status_code == 201 and b.status_code == 200 and a.json()["id"] == b.json()["id"]
    assert await balance(client, 4008) == 50000 - 12500


async def test_order_ownership(client, idem):
    await fund(client, 4009, 20000, idem)
    oid = (await client.post("/api/orders", json={"product_id": 1, "recipient_username": "friend_seven"}, headers={**auth(4009), **idem()})).json()["id"]
    assert (await client.get(f"/api/orders/{oid}", headers=auth(4009))).status_code == 200
    assert (await client.get(f"/api/orders/{oid}", headers=auth(4010))).status_code == 404
    mine = (await client.get("/api/orders", headers=auth(4010))).json()
    assert mine["total"] == 0


async def test_inactive_product_cannot_be_ordered(client, idem):
    await fund(client, 4011, 30000, idem)
    await client.patch("/api/admin/products/2", json={"is_active": False}, headers=auth(ADMIN))
    r = await client.post("/api/orders", json={"product_id": 2, "recipient_username": "friend_eight"}, headers={**auth(4011), **idem()})
    assert r.status_code == 400
    await client.patch("/api/admin/products/2", json={"is_active": True}, headers=auth(ADMIN))


# ---------- Ledger yaxlitligi ----------
async def test_ledger_matches_wallets():
    """Har bir hamyonning balansi o'z jurnalidagi yozuvlar yig'indisiga teng bo'lishi shart."""
    async with SessionLocal() as db:
        wallets = (await db.execute(select(Wallet))).scalars().all()
        assert wallets
        for w in wallets:
            total = (await db.execute(select(func.coalesce(func.sum(Transaction.amount), 0)).where(Transaction.wallet_id == w.id))).scalar_one()
            assert total == w.balance, f"wallet {w.id}: jurnal {total} != balans {w.balance}"
