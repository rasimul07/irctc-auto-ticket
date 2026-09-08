# Rail Ticket API

Shared backend for the **IRCTC Tatkal Chrome extension** and future **Ionic Android / iOS apps**.

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
| `DATABASE_URL` | Postgres connection string (local, RDS, or Supabase) |
| `DB_HOST` | Supabase/alternate host when password has special characters |
| `DB_USER` | Database user (default `postgres`) |
| `DB_PASSWORD` | Database password (use with `DB_HOST`; avoids URL-encoding issues) |
| `DB_NAME` | Database name (Supabase default: `postgres`) |
| `DB_PORT` | Database port (default `5432`) |
| `DB_SSL` | Set `true` for Supabase (auto-enabled for `*.supabase.co`) |
| `FREE_TRIAL_DAYS` | Trial length after BMC `recurring_donation.started` (default `7`) |
| `COFFEE_TOKENS_PER_MONTH` | Tokens granted per `donation.created` (default `10`) |
| `COFFEE_TOKEN_PERIOD_DAYS` | Coffee token validity window (default `30`) |
| `BMC_PLAN_BASIC` | BMC membership level name for Basic (default `Basic`) |
| `BMC_PLAN_PRO` | BMC membership level name for Pro (default `Pro`) |
| `BMC_WEBHOOK_SECRET` | Buy Me a Coffee webhook HMAC secret |
| `CORS_ORIGIN` | `*` for dev or comma-separated origins |
| `ALLOWED_CLIENT_TYPES` | `chrome_extension,ionic_android,ionic_ios` |

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

Mobile apps use the same endpoints with:

```http
X-Client-Type: ionic_android
```

or

```http
X-Client-Type: ionic_ios
```

### Response format

Success:

```json
{ "ok": true, "data": { } }
```

Error:

```json
{ "ok": false, "error": { "code": "NO_TOKENS", "message": "..." } }
```

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | API + DB health |
| POST | `/api/v1/access/register` | Register `{ deviceId }` (no auto-trial) |
| GET | `/api/v1/access/status?deviceId=` | Check access before booking |
| POST | `/api/v1/access/link` | Link `{ deviceId, email }` after BMC purchase |
| POST | `/api/v1/access/consume-token` | Deduct 1 token at payment page `{ deviceId, usageKey }` |
| POST | `/webhooks/bmc` | BMC webhook (licenses & tokens) |

### Register example

```bash
curl -X POST http://localhost:3000/api/v1/access/register \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: chrome_extension" \
  -d "{\"deviceId\":\"test-device-123\"}"
```

Returns `tier: "none"`, `allowed: false` until the user links a BMC email with an active license.

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

### Consume token example

```bash
curl -X POST http://localhost:3000/api/v1/access/consume-token \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: chrome_extension" \
  -d "{\"deviceId\":\"test-device-123\",\"usageKey\":\"booking-session-uuid\"}"
```

## Access model

| Plan | BMC event | Chrome extension | Mobile apps | Usage |
|------|-----------|------------------|-------------|-------|
| `none` | — | blocked | blocked | Register only; link email after BMC |
| `trial` | `recurring_donation.started` | unlimited | blocked | `FREE_TRIAL_DAYS` from webhook |
| `coffee` | `donation.created` | token-based | blocked | `COFFEE_TOKENS_PER_MONTH` per period |
| `basic` | `membership.*` level **Basic** | unlimited | blocked | unlimited |
| `pro` | `membership.*` level **Pro** | unlimited | allowed | unlimited |

Plan priority (same email): `pro` > `basic` > `coffee` > `trial`. Lower-tier webhooks do not downgrade an active higher tier.

1 token is consumed when the client reaches the IRCTC payment page (`bkgPaymentOptions`). Unlimited plans skip deduction. The same `usageKey` per booking session is idempotent.

## Buy Me a Coffee webhook

1. In BMC dashboard → Integrations → Webhooks, set URL to:
   - Local (via ngrok): `https://YOUR-NGROK/webhooks/bmc`
   - Production: `https://api.yourdomain.com/webhooks/bmc`
2. Set `BMC_WEBHOOK_SECRET` in `.env` to match BMC (signing secret on webhook detail page)
3. Subscribe to events:
   - `recurring_donation.started`, `recurring_donation.cancelled`
   - `donation.created`, `donation.refunded`
   - `membership.started`, `membership.updated`, `membership.cancelled`, `membership.paused`
4. Verify signature via `x-signature-sha256` header (HMAC-SHA256 of raw body)

Webhook stores event in `bmc_events` (idempotent) and upserts `licenses`.

## AWS RDS later

Update only `.env`:

```env
DATABASE_URL=postgresql://user:pass@your-rds-endpoint:5432/rail_ticket?sslmode=require
```

Run `npm run db:migrate` against RDS once.

## Supabase

Use either a URL-encoded `DATABASE_URL` or split variables (recommended when the password contains `@` or other special characters):

```env
DB_HOST=db.xxxxx.supabase.co
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=postgres
DB_PORT=5432
DB_SSL=true
```

SSL and IPv4-first DNS are configured automatically for Supabase hosts.

Run `npm run db:migrate` once against your Supabase project.

## Deploy to EC2 (Docker + GitHub Actions)

Pushes to `main` that change `backend/**` trigger [`.github/workflows/deploy-backend.yml`](../.github/workflows/deploy-backend.yml), which SSHs into EC2 and runs [`scripts/deploy.sh`](scripts/deploy.sh).

### One-time EC2 setup

1. Install Docker and the Compose plugin
2. Clone the repo to `~/irctc-auto-ticket` (SSH deploy key for private repo)
3. Create `backend/.env` manually on the server (never commit). Supabase example:

```env
PORT=3000
NODE_ENV=production
API_BASE_PATH=/api/v1
DB_HOST=db.xxxxx.supabase.co
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=postgres
DB_PORT=5432
DB_SSL=true
FREE_TRIAL_DAYS=7
COFFEE_TOKENS_PER_MONTH=10
COFFEE_TOKEN_PERIOD_DAYS=30
BMC_PLAN_BASIC=Basic
BMC_PLAN_PRO=Pro
JWT_SECRET=long-random-secret
BMC_WEBHOOK_SECRET=your-bmc-secret
CORS_ORIGIN=*
ALLOWED_CLIENT_TYPES=chrome_extension,ionic_android,ionic_ios
```

4. Open security group: HTTP/HTTPS for Nginx, port 3000 for the API container
5. First deploy manually:

```bash
chmod +x ~/irctc-auto-ticket/backend/scripts/deploy.sh
bash ~/irctc-auto-ticket/backend/scripts/deploy.sh
```

### GitHub Actions secrets

In **Repo → Settings → Secrets and variables → Actions**, add:

| Secret | Description |
|--------|-------------|
| `EC2_HOST` | EC2 public IP or Elastic IP |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Private SSH key for Actions → EC2 (add matching public key to EC2 `~/.ssh/authorized_keys`) |

Use a **separate** key from the EC2 → GitHub deploy key.

### Manual redeploy on EC2

```bash
bash ~/irctc-auto-ticket/backend/scripts/deploy.sh
```

### Logs and status

```bash
docker ps
docker logs -f rail-ticket-api
curl http://localhost:3000/health
```

The deploy script stops any PM2 processes to avoid port 3000 conflicts, rebuilds the Docker image, runs migrations, and verifies `/health`.

## Ionic reuse (future)

Use the same endpoints from Angular/Ionic with `X-Client-Type: ionic_android` or `ionic_ios`. Pro plan required for mobile client access.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start API with nodemon |
| `npm start` | Start API |
| `npm run db:up` | Start Docker Postgres |
| `npm run db:down` | Stop Docker Postgres |
| `npm run db:migrate` | Apply SQL migrations |
| `bash scripts/deploy.sh` | Production deploy on EC2 (also run by CI) |
