// P2P / on-off ramp partners. P2Pal never holds user funds or fiat — the partner handles KYC and payments.
import { ENV } from '../config/env';

const ONRAMP_NET = { tron: 'trc20', bsc: 'bep20' };

export const P2P_PROVIDERS = [
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
        network: ONRAMP_NET[network], // trc20 | bep20
        fiatType: '1', // INR
        paymentMethod: '1', // UPI instant
        ...(side === 'buy' ? { walletAddress: address } : {}),
        ...(amount ? (side === 'buy' ? { fiatAmount: String(amount) } : { coinAmount: String(amount) }) : {}),
      });
      return `https://onramp.money/main/${side === 'buy' ? 'buy' : 'sell'}/?${p}`;
    },
  },
];
