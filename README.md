# Premiumhub & PHAdmin

> Complete, production-ready eCommerce platform and administrative control center engineered with HTML5, CSS3, Vanilla JavaScript ES Modules, and Firebase.
> Developed by **MD ABDULLAH**.

---

## 🌟 Architecture Overview

- **Public Storefront (`Premiumhub`)**:
  - Responsive catalog with compact image + price focus
  - Admin-managed promotional banner carousel & notice box
  - Revalidated server-side price checkout
  - Dual payment channels: Crypto (USDT BEP20, USDC, SOL) & Naira Bank Transfers (OPay, Moniepoint)
  - Real-time customer order tracking & unique numeric Profile UIDs (e.g. `#2583`)
  - Verifiable invoice generation with client-side PDF & PNG downloads
  - Independent PWA with custom install popup & offline fallback
- **Admin Portal (`PHAdmin`)**:
  - Accessible at `/admin/`
  - Purple + White dashboard theme with Dark Navy sidebar
  - Live Firestore statistical cards & weekly sales charts
  - Products CRUD with stock toggle & category assignments
  - Order verification workflow, transaction reference audit, and CSV export
  - Crypto deposit wallets & Naira bank accounts management
  - Media library & site announcement banner management
  - Independent Admin PWA with separate service worker scope (`/admin/`)
- **Backend & Notifications**:
  - Cloud Firestore with Role-Based Access Control (`firestore.rules`)
  - Server-side Telegram Bot new-order alerts via Firebase Cloud Functions and Google Secret Manager

---

## 🚀 Setup & Firebase Deployment

### 1. Prerequisites & CLI Installation
Install the Firebase CLI globally on your workstation:
```bash
npm install -g firebase-tools
```

### 2. Sign In & Select Project
```bash
firebase login
firebase use ecommerceproject-ca840
```

### 3. Configure Telegram Bot Secrets Privately
To keep the Telegram bot token completely secret and out of client browsers and git repositories:
```bash
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
```
When prompted, paste your rotated token obtained from BotFather.

Set your administrator Chat ID:
```bash
firebase functions:config:set telegram.chat_id="YOUR_ADMIN_CHAT_ID"
```

### 4. Deploy Database Rules & Cloud Functions
```bash
# Deploy Firestore & Storage Security Rules
firebase deploy --only firestore:rules,storage

# Deploy Cloud Functions for Telegram Notification Queue
firebase deploy --only functions

# Deploy Web Hosting
npm run build
firebase deploy --only hosting
```

---

## 🛡️ Creating the First Administrator Account
1. Open your deployed website or preview at `/admin/index.html`.
2. Enter your desired administrator email and password.
3. If no administrator account exists in the database yet, the system's initialization guard automatically provisions your account with the `role: "admin"` claim.
4. Subsequent logins verify against this administrator role, locking out non-admin visitors.

---

## 📱 Progressive Web Apps (PWAs)
- **Premiumhub PWA**:
  - Manifest: `/pwa/main.webmanifest`
  - Scope: `/`
  - Icon: `/assets/icons/premiumhub-512.png`
- **PHAdmin PWA**:
  - Manifest: `/pwa/admin.webmanifest`
  - Scope: `/admin/`
  - Icon: `/assets/icons/phadmin-512.png`

On Android/Chrome, tap the in-app "Install Now" banner. On iOS Safari, tap **Share** → **Add to Home Screen**.

---

## 👨‍💻 Developer Credit
Engineered by **MD ABDULLAH**.
Licensed under the Apache-2.0 License.
