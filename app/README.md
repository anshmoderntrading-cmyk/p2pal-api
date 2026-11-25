# P2Pal — USDT Wallet (TRC20 + BEP20)

Self-custody USDT wallet with gas-free transfers and P2P (INR ↔ USDT) via partners.

## Features
- USDT only, on TRON (TRC20) and BNB Smart Chain (BEP20)
- Deposit (QR + address) and Withdraw to any address
- **Gas-free**: network fee is paid in USDT; the P2Pal backend funds TRX/BNB just-in-time
- P2P buy/sell through Onramp.money or your own P2P site (`EXPO_PUBLIC_P2P_URL`)
- 6-digit PIN keypad, biometric unlock, configurable auto-lock, change PIN
- Recovery phrase hidden by default, screenshot-blocked, PIN-only to view
- Look-alike address (address poisoning) warning and first-time-address warning
- Activity across both networks; network-fee transactions labelled

## Build
APK is built by GitHub Actions (`.github/workflows/build-apk.yml`). App config comes from
repository secrets with the same names as `.env.example`.

## Backend
See `../server.js` — requires `TREASURY_MNEMONIC` (a separate wallet that only pays network fees).
