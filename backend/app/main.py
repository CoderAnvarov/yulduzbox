from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler  # noqa: F401
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes import admin, auth, orders, products, wallet
from app.core.config import settings
from app.core.database import get_db
from app.core.errors import register_error_handlers
from app.core.limiter import limiter

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url=None if settings.is_production else "/api/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/api/openapi.json",
)

app.state.limiter = limiter
register_error_handlers(app)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
)

for r in (auth.router, wallet.router, products.router, orders.router, admin.router):
    app.include_router(r)


@app.get("/api/health", tags=["system"])
async def health(db: AsyncSession = Depends(get_db)) -> dict:
    """Server va bazaning ishlayotganini tekshiradi."""
    await db.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.environment,
        "database": "connected",
    }
