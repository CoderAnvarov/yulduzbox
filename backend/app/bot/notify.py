import logging

import httpx

from app.core.config import settings

log = logging.getLogger("notify")


async def _send(chat_id: int, text: str) -> None:
    if not settings.bot_token_is_real:
        log.info("BOT_TOKEN haqiqiy emas, xabar yuborilmadi: %s", text)
        return
    url = f"https://api.telegram.org/bot{settings.bot_token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.post(url, json={"chat_id": chat_id, "text": text})
            if resp.status_code != 200:
                log.warning("Telegram xabar yubormadi (chat %s): %s", chat_id, resp.status_code)
    except Exception:  # bildirishnoma xatosi asosiy jarayonni buzmasligi kerak
        log.exception("Bildirishnoma yuborishda xato")


async def notify_user(telegram_id: int, text: str) -> None:
    await _send(telegram_id, text)


async def notify_admins(text: str) -> None:
    for admin_id in settings.admin_ids:
        await _send(admin_id, text)
