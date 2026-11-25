# P2Pal: Non-custodial Crypto Wallet

Trust Wallet jaisa wallet. Networks: **TRON (USDT-TRC20), BNB Chain, Ethereum, Polygon**.
App: React Native (Expo). Backend: chhota Node.js server (Render pe deploy).

## Features: kaunsi file mein kya hai

| Feature | File |
|---|---|
| 12-word seed phrase banana + confirm | `src/services/wallet.js`, `CreateWalletScreen`, `ConfirmSeedScreen` |
| Purana wallet import (Trust/MetaMask/TronLink) | `ImportWalletScreen` |
| Balance + token list (INR value) | `src/services/balances.js`, `prices.js`, `HomeScreen` |
| Send / Receive + QR scan | `send.js`, `SendScreen`, `ScanScreen`, `ReceiveScreen` |
| Transaction history | `history.js`, `HistoryScreen` |
| PIN + fingerprint lock, auto-lock, galat PIN pe lockout | `secure.js`, `auth.js`, `UnlockScreen`, `SetPinScreen` |
| Seed sirf phone me encrypted (Keychain/Keystore), screenshot block | `secure.js`, `expo-screen-capture` |
| In-app swap pe 0.5–1% fee (1inch) | `swap.js`, `SwapScreen`, `backend/server.js` |
| Buy crypto (Onramp.money / Transak commission) | `onramp.js`, `BuyScreen` |
| TRX staking + SR voting | `staking.js`, `StakeScreen` |
| Listing fee (featured tokens ⭐) | `backend/featured-tokens.json`, `tokens.js` |
| Push notification ("USDT receive hua") | `notifications.js`, `backend/server.js` |

## 1. App chalana

```bash
npm install
npx expo install --fix      # Expo SDK ke hisaab se versions sahi kar dega
cp .env.example .env        # keys bharo
npx expo run:android        # Expo Go me NAHI chalega (native modules), dev build chahiye
```

APK banane ke liye: `npm i -g eas-cli && eas login && eas build -p android --profile preview`

## 2. Backend (Render pe)

```bash
cd backend && npm install && npm start
```
Render pe: New → Web Service → root dir `backend` → start command `npm start` → `backend/.env.example` wale env vars daalo.
Render ka free plan sleep ho jaata hai aur disk reset ho jaati hai. Notifications ke liye paid instance + persistent disk lo (ya subscribers ko Postgres me shift karo).

## 3. Keys kahan se milengi

- **Alchemy** (ETH/Polygon RPC): alchemy.com
- **TronGrid**: trongrid.io
- **Etherscan V2** (history): etherscan.io/apis. Dhyan do: BNB Chain ki history ke liye paid plan lag sakta hai
- **1inch** (swap): business.1inch.com/portal. `FEE_RECEIVER` mein apna EVM address daalo, swap fee wahin aayegi
- **Onramp.money / Transak**: partner sign-up karke App ID / API key lo
- **TRON SR**: `EXPO_PUBLIC_TRON_SR_ADDRESS` mein apna ya partner SR address daalo. Users ke votes wahan jayenge, aur SR jo reward share karega wahi aapka cut hai

## 4. Security (launch se pehle zaroori)

- [ ] Seed/private key kabhi server, log, analytics ya Crashlytics mein na jaaye (code mein nahi jaati, aap bhi mat bhejna)
- [ ] `EXPO_PUBLIC_*` values app ke andar dikhti hain, isliye koi secret wahan mat rakhna (1inch key backend mein hai)
- [ ] **Professional security audit** karwao (Hacken, CertiK, Halborn ya koi Indian firm)
- [ ] Mainnet pe pehle chhote amount se har feature test karo
- [ ] Release build mein `allowBackup: false` hai (Android backup se seed leak nahi hoga)

## 5. Play Store

- Crypto wallet ke liye Play Console ka *Financial features* declaration bharna hoga
- Privacy policy URL chahiye (bolna hai ki app non-custodial hai aur keys collect nahi hoti)
- Pehle APK apni Telegram community mein test karwao, phir store pe daalo
- India: crypto service ke liye FIU-IND registration ke baare mein CA/lawyer se baat karo

## Abhi kya nahi hai (Phase 2)

- TRON pe swap (SunSwap integration)
- BNB staking
- WalletConnect (dApps connect karna)
- Speed: Seed derivation JS mein hai (1–2 sec). `react-native-quick-crypto` lagane se fast ho jayega
