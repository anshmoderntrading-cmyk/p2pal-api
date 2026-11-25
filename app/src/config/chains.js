import { ENV } from './env';

export const CHAINS = {
  tron: {
    key: 'tron',
    name: 'TRON',
    type: 'tron',
    symbol: 'TRX',
    decimals: 6,
    coingeckoId: 'tron',
    fullHost: 'https://api.trongrid.io',
    explorerTx: (h) => `https://tronscan.org/#/transaction/${h}`,
    usdt: { symbol: 'USDT', address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', decimals: 6, coingeckoId: 'tether', label: 'TRC20' },
  },
  bsc: {
    key: 'bsc',
    name: 'BNB Chain',
    type: 'evm',
    chainId: 56,
    symbol: 'BNB',
    decimals: 18,
    coingeckoId: 'binancecoin',
    rpc: ENV.BSC_RPC,
    explorerTx: (h) => `https://bscscan.com/tx/${h}`,
    usdt: { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, coingeckoId: 'tether', label: 'BEP20' },
  },
  eth: {
    key: 'eth',
    name: 'Ethereum',
    type: 'evm',
    chainId: 1,
    symbol: 'ETH',
    decimals: 18,
    coingeckoId: 'ethereum',
    rpc: ENV.ETH_RPC,
    explorerTx: (h) => `https://etherscan.io/tx/${h}`,
    usdt: { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, coingeckoId: 'tether', label: 'ERC20' },
  },
  polygon: {
    key: 'polygon',
    name: 'Polygon',
    type: 'evm',
    chainId: 137,
    symbol: 'POL',
    decimals: 18,
    coingeckoId: 'polygon-ecosystem-token',
    rpc: ENV.POLYGON_RPC,
    explorerTx: (h) => `https://polygonscan.com/tx/${h}`,
    usdt: { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, coingeckoId: 'tether', label: 'Polygon' },
  },
};

export const CHAIN_LIST = Object.values(CHAINS);
