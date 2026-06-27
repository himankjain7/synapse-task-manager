import * as Google from 'expo-auth-session/providers/google';
import type { AuthSessionResult } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import api from './api';

WebBrowser.maybeCompleteAuthSession();

export interface GoogleLoginResult {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    provider: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  token: string;
  expiresIn: number;
  isNewUser: boolean;
  workspace?: { id: string; name: string };
}

interface GoogleAuthResponse {
  success: boolean;
  data: GoogleLoginResult;
}

export function useGoogleAuthRequest() {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId,
    selectAccount: true,
  });

  return { request, response, promptAsync };
}

export async function exchangeGoogleToken(idToken: string): Promise<GoogleLoginResult> {
  const res = await api.post<GoogleAuthResponse>('/api/v1/auth/google', { idToken });
  return res.data.data;
}

export function getIdTokenFromResponse(response: AuthSessionResult | null): string | null {
  if (response?.type === 'success' && response.params?.id_token) {
    return response.params.id_token;
  }
  return null;
}
