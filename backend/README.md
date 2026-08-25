# Rail Ticket API

Shared backend for the **IRCTC Tatkal Chrome extension** and future **Ionic Android app**.

## Stack

- Express
- PostgreSQL 16 (Docker locally, AWS RDS later)
- Environment config via `.env`

## Quick start

```bash
cd backend
cp .env.example .env
npm install
npm run db:up
npm run db:migrate
npm run dev
```

If Docker is not installed, install PostgreSQL locally, create database `rail_ticket`, set `DATABASE_URL` in `.env`, then run `npm run db:migrate` and `npm run dev`.

Verify:

```bash
curl http://localhost:3000/health
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `PORT` | API port (default `3000`) |
| `DATABASE_URL` | Postgres connection string |
| `FREE_TRIAL_DAYS` | Trial length per client+device (default `7`) |
| `BMC_WEBHOOK_SECRET` | Buy Me a Coffee webhook HMAC secret |
| `CORS_ORIGIN` | `*` for dev or comma-separated origins |
| `ALLOWED_CLIENT_TYPES` | `chrome_extension,ionic_android` |

Copy [`/.env.example`](.env.example) to `.env` and edit values.

## Shared API contract

Base URL:

- Dev: `http://localhost:3000`
- Prod: `https://api.yourdomain.com`

All `/api/v1/access/*` routes require:

```http
X-Client-Type: chrome_extension
Content-Type: application/json
```

Ionic app later uses the same endpoints with:

```http
X-Client-Type: ionic_android
```

### Response format

Success:

```json
{ "ok": true, "data": { } }
```

Error:

```json
{ "ok": false, "error": { "code": "TRIAL_EXPIRED", "message": "..." } }
```

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | API + DB health |
| POST | `/api/v1/access/register` | Start trial for `{ deviceId }` |
| GET | `/api/v1/access/status?deviceId=` | Check access before booking |
| POST | `/api/v1/access/link` | Link `{ deviceId, email }` after BMC payment |
| POST | `/webhooks/buy-me-a-coffee` | BMC webhook (creates/extends license) |

### Register example

```bash
curl -X POST http://localhost:3000/api/v1/access/register \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: chrome_extension" \
  -d "{\"deviceId\":\"test-device-123\"}"
```

### Status example

```bash
curl "http://localhost:3000/api/v1/access/status?deviceId=test-device-123" \
  -H "X-Client-Type: chrome_extension"
```

### Link email example

```bash
curl -X POST http://localhost:3000/api/v1/access/link \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: chrome_extension" \
  -d "{\"deviceId\":\"test-device-123\",\"email\":\"user@example.com\"}"
```

## Access model

1. **Trial** — first register per `(client_type, device_id)` gets `FREE_TRIAL_DAYS`
2. **Paid** — BMC webhook upserts `licenses` by email; client links email to device
3. **Expired** — trial ended and no active license

Paid licenses are **shared across clients** (extension + Ionic) when the same email is linked.

## Buy Me a Coffee webhook

1. In BMC dashboard, set webhook URL to:
   - Local (via ngrok): `https://YOUR-NGROK/webhooks/buy-me-a-coffee`
   - Production: `https://api.yourdomain.com/webhooks/buy-me-a-coffee`
2. Set `BMC_WEBHOOK_SECRET` in `.env` to match BMC
3. Webhook stores event in `bmc_events` (idempotent) and upserts `licenses`

## AWS RDS later

Update only `.env`:

```env
DATABASE_URL=postgresql://user:pass@your-rds-endpoint:5432/rail_ticket?sslmode=require
```

Run `npm run db:migrate` against RDS once.

## Ionic reuse (future)

Use the same endpoints from Angular/Ionic with `X-Client-Type: ionic_android`. No backend changes required.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start API with nodemon |
| `npm start` | Start API |
| `npm run db:up` | Start Docker Postgres |
| `npm run db:down` | Stop Docker Postgres |
| `npm run db:migrate` | Apply SQL migrations |
