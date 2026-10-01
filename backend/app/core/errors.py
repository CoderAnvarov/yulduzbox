from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded


class AppError(Exception):
    """Biznes xatolari. Frontend `detail` (matn) va `code` (mashina uchun) oladi."""

    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message


def not_found(message: str = "Topilmadi") -> AppError:
    return AppError(404, "not_found", message)


def conflict(message: str) -> AppError:
    return AppError(409, "invalid_state", message)


def bad_request(code: str, message: str) -> AppError:
    return AppError(400, code, message)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.message, "code": exc.code})

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"detail": "Kiritilgan ma'lumot noto'g'ri", "code": "validation_error"},
        )

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(_: Request, exc: RateLimitExceeded):
        return JSONResponse(
            status_code=429,
            content={"detail": "Juda ko'p so'rov. Birozdan keyin urinib ko'ring", "code": "rate_limited"},
        )
