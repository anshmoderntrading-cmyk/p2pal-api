// Buy crypto (INR → USDT) partners. Har purchase pe partner aapko commission deta hai
// (partner dashboard me sign-up karke API key / App ID lo).
import { ENV } from '../config/env';

const TRANSAK_NET = { tron: 'tron', bsc: 'bsc', eth: 'ethereum', polygon: 'polygon' };
const ONRAMP_NET = { tron: 'trc20', bsc: 'bep20', eth: 'erc20', polygon: 'matic20' };

export function transakUrl({ chainKey, coin, address }) {
  const p = new URLSearchParams({
    apiKey: ENV.TRANSAK_API_KEY,
    cryptoCurrencyCode: coin,
    network: TRANSAK_NET[chainKey],
    walletAddress: address,
    fiatCurrency: 'INR',
    disableWalletAddressForm: 'true',
  });
  return `https://global.transak.com/?${p}`;
}

export function onrampUrl({ chainKey, coin, address }) {
  const p = new URLSearchParams({
    appId: ENV.ONRAMP_APP_ID,
    walletAddress: address,
    coinCode: coin.toLowerCase(),
    network: ONRAMP_NET[chainKey],
  });
  return `https://onramp.money/main/buy/?${p}`;
}

export const PROVIDERS = [
  { key: 'onramp', name: 'Onramp.money', note: 'UPI / IMPS — India ke liye best', build: onrampUrl, ready: () => !!ENV.ONRAMP_APP_ID },
  { key: 'transak', name: 'Transak', note: 'Card / Bank', build: transakUrl, ready: () => !!ENV.TRANSAK_API_KEY },
];
