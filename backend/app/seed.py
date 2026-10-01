"""Boshlang'ich Stars paketlarini qo'shadi (takroran ishga tushirsa ham xavfsiz).
Ishga tushirish:  python -m app.seed
DIQQAT: narxlar NAMUNA. Admin panelda o'zingizning narxlaringizga o'zgartiring."""
import asyncio

from sqlalchemy import select

from app.core.database import SessionLocal, engine
from app.models import Product

PACKAGES = [(50, 12500), (100, 25000), (250, 62500), (500, 125000), (1000, 250000)]


async def main() -> None:
    async with SessionLocal() as db:
        for order, (stars, price) in enumerate(PACKAGES):
            exists = (await db.execute(select(Product).where(Product.stars_amount == stars))).scalar_one_or_none()
            if not exists:
                db.add(Product(stars_amount=stars, price_uzs=price, sort_order=order))
        await db.commit()
    await engine.dispose()
    print("Paketlar tayyor.")


if __name__ == "__main__":
    asyncio.run(main())
