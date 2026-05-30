sbp_361f341d4848588892c649c37876a65b49397993

Rahmatraf@123

# Port for the Express server
PORT=3000
# Pooled connection string used by the Prisma Client
# Connect to Supabase via connection pooling
DATABASE_URL="postgresql://postgres.gtpnxtyparsebptbotwq:Rahmatraf@123@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection to the database. Used for migrations
DIRECT_URL="postgresql://postgres.gtpnxtyparsebptbotwq:Rahmatraf@123@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Secret key for JWT standard user auth
JWT_SECRET=
# Secret header key for cron scheduler webhook
CRON_SECRET_KEY=
# Secret for short-lived retention quiz token generation
RETENTION_TOKEN_SECRET=
# SMTP Host
EMAIL_HOST=
# SMTP Port
EMAIL_PORT=
# SMTP User
EMAIL_USER=
# SMTP Password
EMAIL_PASS=
# Base URL for the API
BASE_URL=

token vercel = vcp_3HkBA8s1mdlFwAOfTQJuIN8gPwz9qqrbPeUYGmjSd4rAsOrvGb2qvGyk


prompt
sekarang masuk fase 6 Tracking 

16-feature-log.md
, Kerjakan HANYA endpoint POST `/api/v1/track/checkin`

Ikuti semua SOP yang sudah ada di folder docs/:
- SOP 07 untuk controller
- SOP 08 untuk service
- SOP 09 untuk validator dan validateQuery middleware
- SOP 03 untuk query Prisma

Ketentuan tambahan:
- Validasi menggunakan validateQuery (bukan validate) karena data ada di req.query
- Field correctOption TIDAK BOLEH dikirim ke client
- Jangan buat file test
- Jangan ubah file yang tidak berkaitan

jangan tulis code apapun dulu beri plan mode yang berisi hal hal yang akan anda lakukan untuk mengerjakan endpoint ini

-

