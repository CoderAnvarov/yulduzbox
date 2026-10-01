# YulduzBox

Asoschi va support: [@AnvarovCoder](https://t.me/AnvarovCoder)

Telegram Stars sotish platformasi (Telegram Mini App).

- **backend/** — FastAPI, PostgreSQL, Alembic, Aiogram 3
- **frontend/** — React, TypeScript, Vite, Tailwind

## Tez ishga tushirish (Windows PowerShell)

### Backend (1-oyna)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head          # jadvallarni yaratadi
python -m app.seed            # namunaviy Stars paketlarini qo'shadi
uvicorn app.main:app --reload --port 8000
```

### Frontend (2-oyna)
```powershell
cd frontend
npm install
npm run dev
```

### Bot (3-oyna, BOT_TOKEN va https WEBAPP_URL kerak)
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m app.bot.main
```

### Testlar (ixtiyoriy; alohida `stars_test` bazasi kerak)
```powershell
cd backend
pip install -r requirements-dev.txt
$env:TEST_DATABASE_URL="postgresql+asyncpg://stars_user:StarsDev2026@localhost:5432/stars_test"
pytest -q
```

## Xavfsizlik qoidalari
- Narx, balans, holat faqat backendda hisoblanadi.
- Telegram initData HMAC bilan tekshiriladi, admin huquqi serverda tekshiriladi.
- Hamyon o'zgarishlari faqat `transactions` jurnali orqali (o'chirilmaydi).
- `.env` fayli Git'ga tushmaydi. `DEV_FAKE_USER_ID` productionda bo'sh bo'lsin.
