"""Telegram bot (Aiogram 3). Ishga tushirish:  python -m app.bot.main"""
import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.filters import Command, CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, MenuButtonWebApp, Message, WebAppInfo

from app.core.config import settings

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("bot")
dp = Dispatcher()


def _is_https(url: str) -> bool:
    return url.startswith("https://")


@dp.message(CommandStart())
async def cmd_start(message: Message) -> None:
    name = message.from_user.first_name if message.from_user else "do'stim"
    text = f"Salom, {name}! 👋\n\nYulduzBox orqali Telegram Stars xarid qilishingiz mumkin.\nBoshlash uchun pastdagi tugmani bosing.\n\nSavollar bo'lsa: @{settings.support_username}"
    if not _is_https(settings.webapp_url):
        await message.answer(text + "\n\n⚠️ WEBAPP_URL https bilan boshlanishi kerak (backend/.env ni tekshiring).")
        return
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="⭐ Ochish", web_app=WebAppInfo(url=settings.webapp_url))]]
    )
    await message.answer(text, reply_markup=keyboard)


@dp.message(Command("help"))
async def cmd_help(message: Message) -> None:
    await message.answer(
        "Yordam:\n"
        "1) Balansni to'ldiring (to'lov so'rovi yuboring)\n"
        "2) Admin to'lovni tasdiqlaydi\n"
        "3) Stars paketini tanlang va buyurtma bering\n\n"
        f"Ochish uchun /start bosing.\n\nAsoschi va support: @{settings.support_username}"
    )


async def main() -> None:
    if not settings.bot_token_is_real:
        raise SystemExit("BOT_TOKEN haqiqiy emas. backend/.env faylida BotFather tokenini yozing.")
    bot = Bot(token=settings.bot_token)
    if _is_https(settings.webapp_url):
        try:
            await bot.set_chat_menu_button(
                menu_button=MenuButtonWebApp(text="Ochish", web_app=WebAppInfo(url=settings.webapp_url))
            )
        except Exception:
            log.exception("Menu tugmasini o'rnatib bo'lmadi")
    log.info("Bot ishga tushdi")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
