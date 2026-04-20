import Constants from 'expo-constants';

const ENV = {
  development: {
    API_URL: 'http://185.135.137.33:8000/api',
  },
  production: {
    API_URL: 'http://185.135.137.33:8000/api',
  },
};

const getEnv = () => {
  const releaseChannel = Constants.expoConfig?.extra?.releaseChannel ?? 'development';
  return releaseChannel === 'production' ? ENV.production : ENV.development;
};

export const config = getEnv();

export const FREE_TRIP_LIMIT = 3;

export const ADMOB_BANNER_ID =
  process.env.NODE_ENV === 'production'
    ? 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'
    : 'ca-app-pub-3940256099942544/6300978111'; // Test ID

export const ADMOB_INTERSTITIAL_ID =
  process.env.NODE_ENV === 'production'
    ? 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'
    : 'ca-app-pub-3940256099942544/1033173712'; // Test ID

export const REVENUECAT_API_KEY_IOS = 'your_revenuecat_ios_key';
export const REVENUECAT_API_KEY_ANDROID = 'your_revenuecat_android_key';

export const PREMIUM_ENTITLEMENT = 'premium';
