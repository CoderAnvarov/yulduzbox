from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Testlarda o'chiriladi (ENVIRONMENT=test)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["120/minute"],
    enabled=settings.environment != "test",
)
