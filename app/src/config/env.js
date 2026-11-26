// Expo inlines only literal `process.env.EXPO_PUBLIC_*` reads.
export const ENV = {
  BSC_RPC: process.env.EXPO_PUBLIC_BSC_RPC || 'https://bsc-dataseed.bnbchain.org',
  TRONGRID_API_KEY: process.env.EXPO_PUBLIC_TRONGRID_API_KEY || '',
  ETHERSCAN_API_KEY: process.env.EXPO_PUBLIC_ETHERSCAN_API_KEY || '',
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://p2pal-api.onrender.com',
  ONRAMP_APP_ID: process.env.EXPO_PUBLIC_ONRAMP_APP_ID || '2847221',
  TRANSAK_API_KEY: process.env.EXPO_PUBLIC_TRANSAK_API_KEY || '',
  TRANSAK_ENV: process.env.EXPO_PUBLIC_TRANSAK_ENV || 'production',
  P2P_URL: process.env.EXPO_PUBLIC_P2P_URL || '',
  // Public links (safe to ship as defaults; overridable via secrets)
  WEBSITE_URL: process.env.EXPO_PUBLIC_WEBSITE_URL || 'https://p2pal-site.onrender.com',
  PRIVACY_URL: process.env.EXPO_PUBLIC_PRIVACY_URL || 'https://p2pal-site.onrender.com/privacy.html',
  TERMS_URL: process.env.EXPO_PUBLIC_TERMS_URL || 'https://p2pal-site.onrender.com/terms.html',
  TELEGRAM_URL: process.env.EXPO_PUBLIC_TELEGRAM_URL || 'https://t.me/P2Palofficial',
  SUPPORT_URL: process.env.EXPO_PUBLIC_SUPPORT_URL || 'mailto:support@p2palwallet.online',
};

export const APP_VERSION = '1.3.0';
