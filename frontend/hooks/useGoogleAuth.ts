import { useEffect, useCallback, useRef, useState } from 'react';
import { useGoogleAuthRequest, exchangeGoogleToken, getIdTokenFromResponse } from '../services/googleAuth';
import { useAuthStore } from '../store/authStore';

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { request, response, promptAsync } = useGoogleAuthRequest();
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  useEffect(() => {
    if (!response) return;
    const idToken = getIdTokenFromResponse(response);
    if (!idToken) {
      resolveRef.current?.(false);
      return;
    }
    setLoading(true);
    setError(null);
    useAuthStore.getState().googleLogin(idToken)
      .then(() => {
        setLoading(false);
        resolveRef.current?.(true);
      })
      .catch((err: any) => {
        setError(err?.message || 'Google sign-in failed');
        setLoading(false);
        resolveRef.current?.(false);
      });
  }, [response]);

  const signIn = useCallback(async (): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      await promptAsync();
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
      });
    } catch {
      setError('Failed to open Google sign-in');
      setLoading(false);
      return false;
    }
  }, [promptAsync]);

  return { signIn, loading, error, disabled: !request };
}
