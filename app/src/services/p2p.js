// P2P / on-off ramp partners. P2Pal never holds user funds or fiat — the partner handles KYC and payments.
import { ENV } from '../config/env';

const ONRAMP_NET = { tron: 'trc20', bsc: 'bep20' };
const TRANSAK_NET = { tron: 'tron', bsc: 'bsc' };
const TRANSAK_HOST = ENV.TRANSAK_ENV === 'staging' ? 'https://global-stg.transak.com' : 'https://global.transak.com';

export const P2P_PROVIDERS = [
  {
    key: 'transak',
    name: 'Transak',
    tagline: 'UPI · Card · Bank transfer',
    badge: 'Licensed partner',
    ready: () => !!ENV.TRANSAK_API_KEY,
    url: ({ side, network, address, amount }) => {
      const p = new URLSearchParams({
        apiKey: ENV.TRANSAK_API_KEY,
        productsAvailed: side === 'buy' ? 'BUY' : 'SELL',
        cryptoCurrencyCode: 'USDT',
        network: TRANSAK_NET[network],
        fiatCurrency: 'INR',
        ...(side === 'buy' ? { walletAddress: address, disableWalletAddressForm: 'true' } : {}),
        ...(amount ? (side === 'buy' ? { fiatAmount: String(amount) } : { cryptoAmount: String(amount) }) : {}),
      });
      return `${TRANSAK_HOST}/?${p}`;
    },
  },
  {
    key: 'onramp',
    name: 'Onramp.money',
    tagline: 'UPI · IMPS · Bank transfer',
    badge: 'Licensed partner',
    ready: () => !!ENV.ONRAMP_APP_ID,
    url: ({ side, network, address, amount }) => {
      const p = new URLSearchParams({
        appId: ENV.ONRAMP_APP_ID,
        coinCode: 'usdt',
        network: ONRAMP_NET[network],
        ...(side === 'buy' ? { walletAddress: address, fiatType: '1' } : {}),
        ...(amount ? (side === 'buy' ? { fiatAmount: String(amount) } : { coinAmount: String(amount) }) : {}),
      });
      return `https://onramp.money/main/${side === 'buy' ? 'buy' : 'sell'}/?${p}`;
    },
  },
  {
    key: 'custom',
    name: 'P2Pal P2P Market',
    tagline: 'Trade directly with verified merchants',
    badge: 'P2P',
    ready: () => !!ENV.P2P_URL,
    url: ({ side, network, address, amount }) => {
      const p = new URLSearchParams({ side, network, address, ...(amount ? { amount: String(amount) } : {}) });
      return `${ENV.P2P_URL}${ENV.P2P_URL.includes('?') ? '&' : '?'}${p}`;
    },
  },
];
