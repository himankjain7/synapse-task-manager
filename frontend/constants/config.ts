export const Config = {
  API_URL:
    process.env.EXPO_PUBLIC_API_URL ||
    'https://synapse-backend-dolk.onrender.com',

  SOCKET_URL:
    process.env.EXPO_PUBLIC_SOCKET_URL ||
    'https://synapse-backend-dolk.onrender.com',

  API_TIMEOUT: 15000,
  IS_PRODUCTION: !__DEV__,
} as const;
