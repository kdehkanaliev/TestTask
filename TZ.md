Maqsad: Insonlarni kunlik, haftalik va oylik kirim-chiqimlarini hisob-kitob qilish.
Userlarga qulay bo'lishi uchun Telegram bot, Web site va Adminlar uchun Admin panel quriladi.

Kod yozish uchun kerakli tool'lar:
Backend: Node.js -> Express

Database: PostgreSQL

Telegram: Node.js -> Telegram Bot

Web Site va Admin panel: React + TailwindCSS

Deployment: AWS + Docker

---

1. Ma'lumotlar bazasi (PostgreSQL)
   Users:
   id, tg_id, username, email, password, role (user/admin), currency, created_at, updated_at, deleted_at

Categories:
id, user_id (shaxsiy kategoriyalar uchun, null bo'lsa hamma uchun), title, type (income/expense)

Transactions:
id, user_id, category_id, amount, type (income/expense), comment, created_at, deleted_at

Budgets:
id, user_id, category_id, limit_amount, month, year, created_at

---

2. Endpointlar
1. Auth va Userlar
   POST /api/users/auth/register -> Create new User

POST /api/users/auth/login -> Login user

POST /api/users/auth/tg-register -> Create / sync on TG

GET /api/admin/users -> Get all users (only for admins)

PATCH /api/users/:user_id -> Update user profile

PATCH /api/users/delete/:user_id -> Soft delete user (deleted_at null o'rniga date yoziladi)

2. Categories
   GET /api/categories -> Hamma kategoriyalar

POST /api/categories -> Create new Category

PATCH /api/categories/:category_id -> Update category

DELETE /api/categories/:category_id -> Delete category

3. Transaction
   POST /api/transactions -> Yangi xarajat yoki kirim yozish

GET /api/transactions -> Userni hamma kirim-chiqimlarini ko'rish (Params: ?page=1&limit=20&month=8&year=2026)

DELETE /api/transactions/:id -> Xato tranzaksiyani o'chirish

4. Statistika
   GET /api/stats/summary -> Tanlangan oy uchun umumiy kirim, chiqim va balans (Params: ?month=8&year=2026)

GET /api/stats/categories -> Chiqimlarning kategoriyalar bo'yicha foiz taqsimotini olish

GET /api/stats/monthly-trend -> Kunbay, haftabay yoki oybay kirim-chiqim dinamikasini olish

5. Byudjet-limiti
   POST /api/budgets -> Qaysidir kategoriya uchun oylik limit belgilash (month va year bilan)

GET /api/budgets/status -> Limitlarning bajarilish foizini olish

6. AI Assistent
   GET /api/ai/advice -> Foydalanuvchining oylik xarajatlarini tahlil qilib, AI maslahat generatsiya qilish

7. Xavfsizlik Talablari (Security Requirements)
   Autentifikatsiya va Avtorizatsiya:

Web App uchun JWT (JSON Web Token) (Access token 15 min, Refresh token 7 kun).

Parollarni bazada saqlashdan oldin bcrypt yordamida (salt rounds: 10) xeshlashtirish.

---

3. Tezlik va Unumdorlik Talablari (Performance Requirements)
   Keshlar va AI Javoblar:

GET /api/ai/advice endpointi har chaqirilganda AI API'ga qayta so'rov yubormaydi. AI maslahati keshlangan holda bazada saqlanadi.

Pagination (Sahifalash):

GET /api/transactions endpointida tranzaksiyalar ro'yxati kamida page=1&limit=20 ko'rinishida bo'linib uzatiladi.

---

4. Deploy va Infrastruktura (Docker + AWS)
   Konteynerlashtirish (Dockerization):

Backend App: Node.js Express serveri uchun optimallashgan Dockerfile yaratish.

Database: PostgreSQL bazasini rasmiy postgres:alpine imidjidan foydalanib izolatsiyalangan konteynerda yuritish.

Docker Compose: Backend, PostgreSQL va Telegram bot servislarini bitta ekotizimda bog'lash hamda .env faylini xavfsiz boshqarish uchun docker-compose.yml faylidan foydalanish.
