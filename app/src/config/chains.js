import { ENV } from './env';

// P2Pal supports USDT only, on two networks.
export const NETWORKS = {
  tron: {
    key: 'tron',
    label: 'TRC20',
    name: 'TRON',
    nativeSymbol: 'TRX',
    usdt: { address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', decimals: 6 },
    fullHost: 'https://api.trongrid.io',
    explorerTx: (h) => `https://tronscan.org/#/transaction/${h}`,
    placeholder: 'T…',
  },
  bsc: {
    key: 'bsc',
    label: 'BEP20',
    name: 'BNB Smart Chain',
    nativeSymbol: 'BNB',
    chainId: 56,
    rpc: ENV.BSC_RPC,
    usdt: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
    explorerTx: (h) => `https://bscscan.com/tx/${h}`,
    placeholder: '0x…',
  },
};

export const NETWORK_LIST = [NETWORKS.tron, NETWORKS.bsc];
export const addressFor = (addresses, key) => (key === 'tron' ? addresses?.tron : addresses?.evm);
