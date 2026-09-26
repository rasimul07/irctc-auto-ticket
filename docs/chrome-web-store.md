# Chrome Web Store submission guide

Use this checklist when publishing **IRCTC Tatkal Auto Booking**. This extension is **not affiliated with IRCTC** or Indian Railways.

---

## Pre-submission checklist

| Item | Status / action |
|------|-----------------|
| `manifest.json` uses production API host (`api.railticket.tool.mridev.in`) | Verify before zip |
| `localhost` removed from `host_permissions` for store build | Required for review (dev: add locally when unpacked) |
| `packages/core` built (`npm run build`) | Required |
| Icons 128×128 for store listing | Add `icons/icon128.png` if missing (resize from 96px) |
| Privacy policy hosted at a **public HTTPS URL** | See [privacy-policy.md](./privacy-policy.md) |
| Single purpose description matches actual behavior | See below |
| No IRCTC logo / “official” claims in screenshots or title | Required |
| Test on clean Chrome profile (install unpacked zip) | Required |
| `$5` one-time developer registration (Google) | [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) |

---

## Single purpose (store form)

**One sentence:**

> Helps users speed up IRCTC train ticket booking by saving journey and passenger details locally and auto-filling forms on irctc.co.in; the user always completes login CAPTCHA, OTP, and payment manually.

**Do not claim:** official IRCTC app, guaranteed Tatkal success, or CAPTCHA bypass.

---

## Listing copy (paste into dashboard)

### Name (max 75 chars)

`IRCTC Tatkal Auto Booking`

### Short description (max 132 chars)

`Save IRCTC journey & passenger details. Auto-fill booking forms. You complete CAPTCHA, OTP & payment. Not affiliated with IRCTC.`

### Detailed description

```
IRCTC Tatkal Auto Booking is an independent assistant for irctc.co.in. It is NOT affiliated with IRCTC or Indian Railways.

What it does:
• Save login, journey, passengers, and payment preferences in the extension popup
• Open IRCTC train search and auto-fill forms step by step
• Optional Tatkal alarm (AC / non-AC windows)
• Pause for CAPTCHA, OTP, and bank/UPI approval — you stay in control
• Subscription access via Buy Me a Coffee (optional)

What it does NOT do:
• Does not bypass IRCTC security or CAPTCHA
• Does not guarantee ticket availability or booking success
• Does not store payment card CVV on our servers (card data stays in your browser if you choose to save it)

Supported IRCTC flows: e-ticket and classic (nget) paths on www.irctc.co.in.

Privacy: see our privacy policy URL in the listing.
```

### Category

`Productivity` or `Shopping`

---

## Permission justifications (review form)

Copy each block into the **Permission justification** fields in the Chrome Web Store dashboard.

### `storage`

Stores user booking settings (journey, passengers, IRCTC username/password, payment preferences) and a device ID for subscription checks locally on the device. No booking data is sold.

### `tabs`

Opens IRCTC train-search when the user clicks Start, focuses the booking tab, detects navigation between IRCTC steps, and sends messages to the content script on the active IRCTC tab.

### `scripting`

Injects the booking assistant scripts into IRCTC and payment gateway tabs when the user starts automation or when a gateway tab opens during payment. Scripts are not injected on unrelated sites.

### `alarms`

Runs optional Tatkal schedule alarms (user-enabled) to open IRCTC at a chosen time before the Tatkal window.

### Host: `https://www.irctc.co.in/*`

Required to run content scripts on IRCTC e-ticket and nget booking pages so the extension can assist with form filling on the site the user is booking on.

### Host: `https://www.irctcipay.com/*`, `https://pg.irctcpayments.com/*`, `https://mercury.phonepe.com/*`, `https://mercury-t2.phonepe.com/*`

Required only during payment: assists with payment gateway UI on pages the user reaches after clicking Pay on IRCTC. User completes OTP and approval manually.

### Host: `https://api.railticket.tool.mridev.in/*`

Calls our access API to register the device, check subscription status, link Buy Me a Coffee email, and consume booking tokens. No IRCTC password is sent to this API.

---

## Data use & privacy (dashboard)

| Data | Collected? | Where | Purpose |
|------|------------|-------|---------|
| IRCTC username/password | Yes (user-entered) | `chrome.storage.local` only | Auto-fill login on IRCTC |
| Journey / passengers | Yes | Local storage | Auto-fill booking forms |
| Card fields (optional) | Yes | Local storage | Auto-fill payment gateway |
| Device UUID | Yes | Local + access API | Subscription / token tracking |
| BMC email | Yes (user-entered) | Local + access API | Link subscription |
| IRCTC booking history | No | — | — |
| Analytics / ads | No | — | — |

**Privacy policy URL:** host [privacy-policy.md](./privacy-policy.md) at a public URL, e.g. GitHub Pages or `https://your-site.com/privacy`.

---

## Package for upload

From repo root:

```bash
node scripts/build-store-zip.mjs
```

This builds `packages/core`, copies only store-required files into a staging folder, and writes:

`dist/irctc-extension-v<manifest-version>.zip`

Upload that zip in Developer Dashboard → **Package**. The script excludes `backend/`, `.git/`, docs, and unused `packages/core` source/build artifacts.

Manual zip (if needed): include `manifest.json`, `background.js`, `popup.*`, `lib/`, `overlay/`, `sites/`, `icons/`, the three `packages/core/dist/*.iife.js` bundles, `packages/core/src/bot/sites/*/config.js`, and `packages/core/src/theme/tokens.css`.

---

## Common rejection reasons (avoid)

1. **Broad host permissions** — justify each host; remove `localhost` from store build.
2. **Misleading name** — do not use “IRCTC Official”.
3. **Missing privacy policy** — required because you collect credentials locally and call an API.
4. **Remote code** — you ship bundled JS only (`importScripts` / local files). Do not load remote scripts at runtime.
5. **Payment / sensitive data** — state clearly that users complete payment and OTP themselves.

---

## After approval

- Bump `version` in `manifest.json` for each release.
- Submit update zip; review is usually faster for updates.
- Monitor `api.railticket.tool.mridev.in` uptime — extension depends on it for paid access.

---

## Local development vs store build

Store `manifest.json` omits `http://localhost:3000/*`. For local API testing with unpacked extension, temporarily add:

```json
"http://localhost:3000/*"
```

to `host_permissions` and set `USE_PROD_API: false` in `packages/core/src/api/accessConfig.js`, then rebuild core. **Remove before store upload.**
