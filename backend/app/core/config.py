from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Barcha sozlamalar .env faylidan o'qiladi."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "YulduzBox"
    environment: str = "development"
    debug: bool = False

    database_url: str

    bot_token: str
    webapp_url: str = "http://localhost:5173"
    admin_telegram_ids: str = ""
    support_username: str = "AnvarovCoder"

    initdata_max_age_seconds: int = 86400
    cors_origins: str = "http://localhost:5173"
    dev_fake_user_id: str = ""

    @property
    def admin_ids(self) -> list[int]:
        return [int(i.strip()) for i in self.admin_telegram_ids.split(",") if i.strip()]

    @property
    def cors_origin_list(self) -> list[str]:
        return [i.strip() for i in self.cors_origins.split(",") if i.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def bot_token_is_real(self) -> bool:
        if self.environment == "test":
            return False
        return ":" in self.bot_token and "PLACEHOLDER" not in self.bot_token and "CHANGE_ME" not in self.bot_token


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
