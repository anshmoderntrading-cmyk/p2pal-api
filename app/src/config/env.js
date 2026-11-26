// Expo inlines only literal `process.env.EXPO_PUBLIC_*` reads.
export const ENV = {
  BSC_RPC: process.env.EXPO_PUBLIC_BSC_RPC || 'https://bsc-dataseed.bnbchain.org',
  TRONGRID_API_KEY: process.env.EXPO_PUBLIC_TRONGRID_API_KEY || '',
  ETHERSCAN_API_KEY: process.env.EXPO_PUBLIC_ETHERSCAN_API_KEY || '',
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://p2pal-api.onrender.com',
  ONRAMP_APP_ID: process.env.EXPO_PUBLIC_ONRAMP_APP_ID || '',
  TRANSAK_API_KEY: process.env.EXPO_PUBLIC_TRANSAK_API_KEY || '',
  TRANSAK_ENV: process.env.EXPO_PUBLIC_TRANSAK_ENV || 'production',
  P2P_URL: process.env.EXPO_PUBLIC_P2P_URL || '',
  SUPPORT_URL: process.env.EXPO_PUBLIC_SUPPORT_URL || '',
  PRIVACY_URL: process.env.EXPO_PUBLIC_PRIVACY_URL || '',
};

export const APP_VERSION = '1.1.0';
