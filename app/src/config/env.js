// Expo sirf literal `process.env.EXPO_PUBLIC_*` ko inline karta hai — isliye har key alag likhi hai.
export const ENV = {
  ETH_RPC: process.env.EXPO_PUBLIC_ETH_RPC || 'https://ethereum-rpc.publicnode.com',
  BSC_RPC: process.env.EXPO_PUBLIC_BSC_RPC || 'https://bsc-dataseed.bnbchain.org',
  POLYGON_RPC: process.env.EXPO_PUBLIC_POLYGON_RPC || 'https://polygon-bor-rpc.publicnode.com',
  TRONGRID_API_KEY: process.env.EXPO_PUBLIC_TRONGRID_API_KEY || '',
  ETHERSCAN_API_KEY: process.env.EXPO_PUBLIC_ETHERSCAN_API_KEY || '',
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://p2pal-api.onrender.com',
  TRANSAK_API_KEY: process.env.EXPO_PUBLIC_TRANSAK_API_KEY || '',
  ONRAMP_APP_ID: process.env.EXPO_PUBLIC_ONRAMP_APP_ID || '',
  TRON_SR_ADDRESS: process.env.EXPO_PUBLIC_TRON_SR_ADDRESS || '',
  AUTO_LOCK_MS: 60 * 1000, // app background me 1 min se zyada → lock
};
