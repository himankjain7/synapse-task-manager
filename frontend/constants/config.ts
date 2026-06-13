import { Platform } from 'react-native';

// Standard React Native development: localhost doesn't work for Android Emulator.
// Android emulator uses 10.0.2.2. iOS simulator uses localhost (127.0.0.1).
const DEV_API_URL = Platform.select({
  android: 'http://10.0.2.2:5000',
  ios: 'http://localhost:5000',
  default: 'http://localhost:5000',
});

export const Config = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || DEV_API_URL,
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || DEV_API_URL,
  API_TIMEOUT: 15000, // 15s
  IS_PRODUCTION: !__DEV__,
} as const;
