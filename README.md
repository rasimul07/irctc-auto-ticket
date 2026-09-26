# IRCTC Tatkal Auto Booking

Chrome extension (Manifest V3) that automates the live IRCTC e-ticket flow from train search through payment. It fills forms from saved settings, pauses for CAPTCHA/OTP, and leaves bank/UPI approval to you.

## Quick start

1. **Load extension** — `chrome://extensions` → Developer mode → Load unpacked → this repo root
2. **Run API locally** (or point at prod — see [Access and API](#access-and-api))
3. **Popup** — Access tab: link BMC email → Login / Journey / Passengers / Payment tabs → **Save Details**
4. **Start** — **Start Auto-Booking** opens train-search for your chosen site (`/eticket` or `/nget`) and runs the flow below

Reload the extension after changing JS, CSS, or `lib/accessConfig.js`.

**Chrome Web Store:** submission checklist, listing copy, and permission justifications — [`docs/chrome-web-store.md`](docs/chrome-web-store.md). Privacy policy template — [`docs/privacy-policy.md`](docs/privacy-policy.md). Store upload zip: `node scripts/build-store-zip.mjs` → `dist/irctc-extension-v*.zip`.

---

## Access and API

Booking is blocked until the access API returns `allowed: true`. The popup **Access** tab shows tier, valid-until, and status.

1. Start a free trial, buy a coffee, or subscribe on [Buy Me a Coffee](https://buymeacoffee.com/mritools)
2. Enter the same email in the popup → **Link email & refresh**

| Plan | Extension | Tokens |
|------|-----------|--------|
| **Trial** | Unlimited | — (`FREE_TRIAL_DAYS` after BMC recurring signup) |
| **Coffee** | Allowed while tokens remain | 5 per 30 days for 12 months per purchase; 1 consumed at payment page |
| **Basic** | Unlimited | — (BMC Basic membership) |
| **Pro** | Unlimited | — (extension + planned mobile apps) |

Coffee tokens renew monthly for up to 12 months per purchase (`COFFEE_RENEWAL_MONTHS`); after that, renewals stop until the next coffee purchase. Details: [`backend/README.md`](backend/README.md).

### API target

Edit `lib/accessConfig.js`:

| `USE_PROD_API` | Base URL |
|----------------|----------|
| `false` | `http://localhost:3000/api/v1` |
| `true` | `https://api.railticket.tool.mridev.in/api/v1` |

Override per device with `access.apiBase` in stored config. Reload the extension after changes.

**Local backend:**

```bash
cd backend
cp .env.example .env
npm install
npm run db:up
npm run db:migrate
npm run dev
```

Verify: `curl http://localhost:3000/health`

---

## Popup configuration

**Start Auto-Booking** saves, checks access, then tells the background worker to open IRCTC.

| Tab | Purpose |
|-----|---------|
| **Access** | BMC email; confirm status is active |
| **Login** | IRCTC username and password |
| **Journey** | From/to (code or name), date, train no./name, class, quota |
| **Passengers** | Up to 6 names that **already exist** on your IRCTC profile (bot selects from “Existing Passenger”; does not create new IRCTC records) |
| **Timer** | Optional Tatkal alarm — AC **10:00 IST** or non-AC **11:00 IST** |
| **Payment** | Payment method, provider, **Enable auto pay**, and (cards only) auto pay type + card fields — see [Payment options](#payment-options) |

**Required to start:** access allowed, username, password, from, to, date.

---

## Payment options

Settings on the popup **Payment** tab are shared by both site versions. Where they apply depends on the active site:

| Site | Payment method (step 1) | Auto pay / provider (step 2; token consumed) |
|------|-------------------------|-----------------------------------------------|
| **eticket** | `psgninput` — radio before **Calculate Fare** | `bkgPaymentOptions` |
| **nget** | `psgninput` — **Payment Mode** radio before **Continue** | `/nget/payment` |

### Payment method

| Popup value | IRCTC option on `psgninput` | Provider dropdown |
|-------------|----------------------------|-------------------|
| **Cards / Net Banking / Wallets / EMI / UPI_CC / Others** | Credit & debit cards, net banking, wallets, etc. | **Payment Provider** (cards list) |
| **BHIM / UPI** | Pay through BHIM/UPI | **UPI Provider** (UPI list) |

### Enable auto pay

Master switch for automation on `bkgPaymentOptions`. It does **not** change which IRCTC payment category is selected on `psgninput`.

| Setting | On `bkgPaymentOptions` the bot… |
|---------|----------------------------------|
| **Unchecked** | Stops after token consume. Shows the booking-review clone overlay and overlay pause. You choose provider and pay on IRCTC yourself. |
| **Checked** | Selects the configured **provider**, clicks **Pay & Book** when needed, and continues on `irctcipay.com` if redirected (iPay gateway automation). |

OTP, 3-D Secure, and UPI approval are always manual.

### Payment provider

Which bank/gateway option the bot selects on the payment page.

**nget (classic)** — Cards: **IRCTC iPay** and **PhonePe**. BHIM/UPI: **IRCTC iPay**, **PhonePe**, **Razorpay**, **PayU**, and **Amazon Pay** (two-level side menu). E-Wallet and other eticket-only tiles are not used on nget.

**Cards payment method**

| Provider | Bot on IRCTC payment page | After Pay & Book |
|----------|---------------------------|------------------|
| **IRCTC iPay** | Selects the iPay card | Redirects to `irctcipay.com` → [iPay auto pay](#auto-pay-type--irctc-ipay) if auto pay is on |
| **PhonePe** | Selects the PhonePe tile | Pay & Book → `mercury-t2.phonepe.com` → [PhonePe auto pay](#auto-pay-type--phonepe-gateway) if auto pay is on |
| **IRCTC E-Wallet** | Selects the E-Wallet tile | Pay & Book → external flow; pay manually |

**BHIM / UPI payment method**

| Provider | Bot on IRCTC payment page | After Pay & Book |
|----------|---------------------------|------------------|
| **IRCTC iPay** | Selects iPay, then **Click to pay** (no Pay & Book) | Stays on / hands off to iPay UI; complete UPI yourself |
| **PhonePe** | Selects PhonePe tile | Pay & Book → gateway; pay manually |
| **Razorpay** | Selects Razorpay tile | Pay & Book → gateway; pay manually |
| **PayU** | Selects PayU tile | Pay & Book → gateway; pay manually |
| **Amazon Pay** | Selects Amazon Pay tile | Pay & Book → gateway; pay manually |

Gateway scripting runs on **`irctcipay.com`** (IRCTC iPay) and **`mercury-t2.phonepe.com`** / **`mercury.phonepe.com`** (PhonePe). Other providers stop with an overlay pause once the gateway loads.

### Auto pay type (Cards + Enable auto pay only)

Shown in the popup only when **Payment method** is **Cards** and **Enable auto pay** is checked. Saved card fields live in extension storage (`debitCard` / `creditCard` in `irctcConfig`).

PhonePe uses a single **Debit/Credit Card** instrument on the gateway; popup **debit** vs **credit** only picks which saved card object to fill.

#### Auto pay type — IRCTC iPay (`irctcipay.com`)

After Cards + **IRCTC iPay** + Pay & Book:

| Auto pay type | Popup fields | Bot on gateway |
|---------------|--------------|----------------|
| **Debit card** | Card name, number, expiry (MM/YY), CVV | Auto Debit tab → Debit Card → fill **debit** → submit → manual OTP |
| **Credit card** | Same under Credit Card section | Auto Debit tab → Credit Card → fill **credit** → submit → manual 3DS |
| **QR (UPI)** | No card fields | Auto Debit tab → UPI → open QR → manual scan |

#### Auto pay type — PhonePe gateway

After Cards + **PhonePe** + Pay & Book → `mercury-t2.phonepe.com/transact/...`:

| Auto pay type | Popup fields | Bot on PhonePe gateway |
|---------------|--------------|------------------------|
| **Debit card** | Card name, number, expiry (MM/YY), CVV | Click **Debit/Credit Card** → fill **debit** → **Proceed** → manual OTP/3DS |
| **Credit card** | Same under Credit Card section | Click **Debit/Credit Card** → fill **credit** → **Proceed** → manual OTP/3DS |
| **QR (UPI)** | No card fields | Keep/select **UPI** (QR shown by default) → manual scan |

If auto pay is on but card details are missing for debit/credit, the gateway step fails with a clear error.

### Payment decision summary

#### eticket (beta)

```
bkgPaymentOptions (token consumed)
│
├─ Enable auto pay OFF
│     → pause + booking-review overlay; pay manually on IRCTC
│
└─ Enable auto pay ON
      │
      ├─ Payment method: BHIM / UPI
      │     ├─ IRCTC iPay    → select iPay → Click to pay
      │     └─ Other UPI     → select tile → Pay & Book → manual on gateway
      │
      └─ Payment method: Cards
            ├─ IRCTC iPay    → select iPay → Pay & Book → irctcipay.com
            │                    ├─ Debit / Credit → fill saved card → submit → manual OTP
            │                    └─ QR (UPI)       → open QR → manual scan
            ├─ PhonePe         → select tile → Pay & Book → mercury.phonepe.com
            │                    ├─ Debit / Credit → card form → Proceed → manual OTP
            │                    └─ QR (UPI)       → UPI/QR view → manual scan
            └─ E-Wallet        → select tile → Pay & Book → manual on gateway
```

#### nget (classic)

NGET uses a two-level payment UI (`#pay-type` side menu → bank sub-option) instead of flat provider tiles. UPI always goes through **Pay & Book** (no separate “Click to pay” step).

```
/nget/payment (token consumed)
│
├─ Enable auto pay OFF
│     → pause + booking-review overlay; pay manually on IRCTC
│
└─ Enable auto pay ON
      │
      ├─ Payment method: BHIM / UPI
      │     ├─ IRCTC iPay    → BHIM/UPI/USSD → IRCTC iPay New → Pay & Book → pg.irctcpayments.com
      │     │                    └─ QR            → UPI accordion → Show QR → manual scan
      │     ├─ PhonePe       → Multiple Payment Service → PhonePe → Pay & Book → mercury.phonepe.com
      │     ├─ Razorpay      → Multiple Payment Service → Razorpay → Pay & Book → manual on gateway
      │     ├─ PayU          → Multiple Payment Service → PayU → Pay & Book → manual on gateway
      │     └─ Amazon Pay    → BHIM/UPI/USSD → Amazon Pay → Pay & Book → manual on gateway
      │
      └─ Payment method: Cards
            ├─ IRCTC iPay    → side menu IRCTC iPay (credit) → IRCTC iPay New → Pay & Book → pg.irctcpayments.com
            │                    ├─ Debit / Credit → Cards accordion → fill saved card → Pay Now → manual OTP
            │                    └─ QR (UPI)       → UPI accordion → Show QR → manual scan
            └─ PhonePe         → side menu Multiple Payment Service → PhonePe → Pay & Book → mercury.phonepe.com
                                 ├─ Debit / Credit → card form → Proceed → manual OTP
                                 └─ QR (UPI)       → UPI/QR view → manual scan
```

Gateway scripting on nget runs on **`pg.irctcpayments.com`** (IRCTC iPay / IRCTC Payments) and **`mercury-t2.phonepe.com`** / **`mercury.phonepe.com`** (PhonePe). If iPay redirects to **`irctcipay.com`**, the same iPay auto-fill handlers as eticket are used.

**nget BHIM/UPI — sidebar vs tile (step 1 and step 2)**

| UPI Provider | Sidebar (step 1) | Tile (step 2) |
|--------------|------------------|---------------|
| IRCTC iPay | BHIM/ UPI/ USSD | IRCTC iPay New |
| Amazon Pay | BHIM/ UPI/ USSD | Amazon Pay |
| PhonePe | Multiple Payment Service | PhonePe |
| Razorpay | Multiple Payment Service | Razorpay |
| PayU | Multiple Payment Service | PayU |

IRCTC iPay and Amazon Pay share the same sidebar category; the bot picks the correct tile from your popup **UPI Provider** setting.

**Example: Amazon Pay (BHIM/UPI, auto pay ON)**

Popup: **Payment method** = BHIM/UPI, **UPI Provider** = Amazon Pay

```
Step 1 — Sidebar (#pay-type)
  Click: div.bank-type  →  label "BHIM/ UPI/ USSD"
  Active state: .bank-type-active

Step 2 — Provider tile (main panel)
  Click: div.border-all.link  →  span.col-pad "Amazon Pay"

Step 3 — Submit
  Click: button.btn.btn-primary  →  "Pay & Book"

Step 4 — Complete payment on the Amazon Pay gateway manually
```

---

## Booking flow

Path-driven automation. The service worker opens or focuses train-search and sends `START_BOOKING`. An on-page overlay shows the step; URL changes trigger the next step via `IRCTCExt.Bot`.

```
Start / Tatkal alarm
       │
       ▼
  Access check
       │
       ▼
  train-search ── Login (pause for CAPTCHA/OTP)
       │
       ▼
  Search → train-list
       │
       ▼
  Match train → Check Availability → Book (AVAILABLE or RAC only)
       │
       ▼
  psgninput ── Existing passengers → loyalty skip → payment method → Calculate Fare
       │
       ▼
  reviewBooking ── Continue To Payment (+ confirm dialog if shown)
       │
       ▼
  bkgPaymentOptions ── consume token → see Payment options (auto pay / provider / type)
```

**nget (classic)** — same popup settings; path names differ:

```
Start / Tatkal alarm
       │
       ▼
  Access check
       │
       ▼
  train-search ── Language (if modal) → Login (pause for CAPTCHA/OTP)
       │
       ▼
  Search → train-list
       │
       ▼
  Match train → Check Availability → Book (AVAILABLE or RAC only)
       │
       ▼
  psgninput ── Inline passengers → payment mode → Continue
       │
       ▼
  review ── Passenger review popup → Continue To Payment
       │
       ▼
  payment ── consume token → see Payment options (auto pay / provider / type)
```

### Site versions

Choose **IRCTC website version** on the popup **Access** tab (`preferences.bookingSite`).

| Site | Base path | Start URL | Status |
|------|-----------|-----------|--------|
| **eticket** (beta) | `/eticket` | `https://www.irctc.co.in/eticket/train-search` | Fully automated |
| **nget** (classic) | `/nget` | `https://www.irctc.co.in/nget/train-search` | Fully automated |

Site-specific automation lives under [`packages/core/src/bot/sites/eticket/`](packages/core/src/bot/sites/eticket/) and [`packages/core/src/bot/sites/nget/`](packages/core/src/bot/sites/nget/). Shared DOM helpers are in [`packages/core/src/bot/lib/`](packages/core/src/bot/lib/). The active site is resolved by [`packages/core/src/bot/sites/registry.js`](packages/core/src/bot/sites/registry.js) (also loaded at `document_start` via [`sites/registry.js`](sites/registry.js)).

To add a step for a site: implement it in `packages/core/src/bot/sites/<site>/flows/`, wire path detection in `paths.js`, and register selectors in `selectors.js`, then add the files to [`packages/core/build.mjs`](packages/core/build.mjs).

### IRCTC pages (eticket / beta)

| Path | Step |
|------|------|
| `/eticket/train-search` | Login, search |
| `/eticket/train-list` | Pick train, availability, Book |
| `/eticket/psgninput` | Passengers, preferences, Calculate Fare |
| `/eticket/reviewBooking` | Continue to payment |
| `/eticket/bkgPaymentOptions` | Provider, Pay & Book, token consume |
| `irctcipay.com` | IRCTC iPay gateway (cards + auto pay) |
| `mercury-t2.phonepe.com` | PhonePe gateway (cards + auto pay) |
| `/eticket/error` | Auto-restart from train-search (max 3) |

### IRCTC pages (nget / classic)

| Path | Step |
|------|------|
| `/nget/train-search` | Language modal (if shown), login, search |
| `/nget/train-list` | Pick train, availability, Book |
| `/nget/psgninput` | Passengers, payment mode, Continue |
| `/nget/review` | Passenger review popup, Continue to payment |
| `/nget/payment` | Side menu + provider, Pay & Book, token consume |
| `pg.irctcpayments.com` | IRCTC Payments gateway (iPay cards + QR; primary nget gateway) |
| `irctcipay.com` | IRCTC iPay gateway (if redirected from nget) |
| `mercury-t2.phonepe.com` | PhonePe gateway (cards + auto pay) |
| `/nget/error` | Auto-restart from train-search (max 3) |

### Step details

**Login** — Opens USER tab, fills credentials. CAPTCHA/OTP shows overlay **Continue**; you solve on IRCTC first. Session-restore modals are dismissed automatically.

**Search** — From, To, date, quota (Tatkal / General / Ladies), then Search.

**Train list** — Prefer train number, then name; if neither set, first card. Loads class availability, books only **AVAILABLE** or **RAC** (WL/REGRET aborts).

**Passengers** — “Existing Passenger” modal; matches name (+ age/gender/berth/food on duplicate names).

**Preferences** — Skip loyalty, set payment method (matches Payment tab), Calculate Fare.

**Review** — Continue To Payment; handles IRCTC confirmation popup.

**Payment** — Coffee plan: one token per `bookingSessionId` when the payment page loads (`bkgPaymentOptions` on eticket, `/nget/payment` on nget; idempotent). Behavior depends on [Payment options](#payment-options): auto pay off = manual on IRCTC; auto pay on = provider selection + gateway auto-fill (debit/credit/QR).

**nget passengers** — Fills passenger rows inline on `psgninput` (name autocomplete, age, gender, berth); does not use the eticket “Existing Passenger” modal.

### Overlay controls

On IRCTC pages: **Pause**, **Restart** (train-search), **Stop**, and **Continue** (after CAPTCHA/OTP). Elapsed timer tracks the run.

### Retries

| Event | Behavior |
|-------|----------|
| Step error | Retry current path up to 3×, then stop |
| `/eticket/error` | Restart from train-search up to 3× |
| Tatkal alarm | Same flow as manual start at 10:00 or 11:00 IST |

---

## Project layout

```
├── manifest.json          # Extension manifest (v1.0.9)
├── popup.html / popup.js  # Configuration UI
├── background.js          # Alarms, tabs, access gate, script injection
├── content_script.js      # Bot router → sites/registry
├── gateway_script.js      # irctcipay.com resume
├── sites/
│   └── registry.js        # Active site resolver (document_start bootstrap)
├── packages/core/         # @rasimul07/core — shared bot, sites, bundles
│   └── src/bot/sites/
│       ├── eticket/       # Beta IRCTC flow
│       └── nget/          # Classic IRCTC flow
├── lib/                   # Legacy shared helpers (most logic moved to packages/core)
├── overlay/               # Status overlay + payment-page review panel
└── backend/               # Access/licensing API (Express + Postgres)
```

| Module | Role |
|--------|------|
| `packages/core/src/bot/sites/eticket/trainList.js` | Train match, availability, Book (eticket) |
| `packages/core/src/bot/sites/nget/flows/payment.js` | NGET side-menu provider selection, Pay & Book |
| `packages/core/src/bot/sites/nget/` | Classic IRCTC flow (language, login, search, booking, payment) |
| `lib/gateways/irctcPayments.js` | `pg.irctcpayments.com` auto-fill (nget iPay cards + QR) |
| `packages/core/src/bot/lib/passengers.js` | Passenger add/reconcile |
| `packages/core/src/bot/lib/psgnPreferences.js` | Loyalty, payment method, fare, review |
| `packages/core/src/bot/lib/bkgPayment.js` | Provider selection, Pay & Book |
| `lib/gateways/irctcIpay.js` | iPay auto-fill |
| `lib/gateways/phonepe.js` | PhonePe Mercury auto-fill (card + QR) |
| `lib/storage.js` | `chrome.storage.local` → `irctcConfig` |
| `lib/api.js` | Register, status, link email, consume token |

Host permissions: `irctc.co.in`, `irctcipay.com`, `pg.irctcpayments.com`, `mercury-t2.phonepe.com`, `mercury.phonepe.com`, `localhost:3000`, and `api.yourdomain.com` (update `manifest.json` if you use a custom API host).

---

## Security

Credentials, card numbers, and journey data stay in **browser extension storage** only. Do not commit `backend/.env`, `.env`, or secrets.

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| “Access not active” | Access tab → link BMC email; backend running for local dev |
| “No booking tokens” | Coffee plan — buy another coffee or wait for monthly renewal (if within 12-month window) |
| “Saved passenger not found” | Name must match IRCTC profile exactly |
| “Class not available” | Tatkal may be WL/REGRET; bot does not book waitlist |
| Bot idle after navigation | Overlay **Restart** or popup **Start** again; confirm `running` in storage |
| API errors locally | `curl localhost:3000/health`, `USE_PROD_API: false`, reload extension |
| Gateway rejects card | Check name, number, expiry MM/YY, CVV; matching auto pay type (debit/credit) |
| PhonePe Proceed disabled | Saved card invalid or incomplete; fix popup Payment tab fields |
| Auto pay type missing | Auto pay type applies only to **Cards** + auto pay on; UPI payment method has no card fields on popup |
