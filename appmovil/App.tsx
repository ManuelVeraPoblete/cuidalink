import React from 'react';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import RootNavigator from '@/presentation/navigation/RootNavigator';
import { useAuthStore } from '@/presentation/stores/authStore';
import { useInjection } from '@/presentation/hooks/useInjection';
import {
  requestPermissionAndGetToken,
  onTokenRefresh,
  onForegroundMessage,
} from '@/data/notifications/NotificationService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
  },
});

function AuthListener() {
  const { setUser, setLoading } = useAuthStore();
  const { authRepo } = useInjection();

  React.useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await SecureStore.getItemAsync('jwt_token');
        if (token) {
          const user = await authRepo.getMe();
          setUser(user);
        } else {
          setUser(null);
        }
      } catch {
        await SecureStore.deleteItemAsync('jwt_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [setUser, setLoading, authRepo]);

  return null;
}

function FcmSetup() {
  const { authRepo } = useInjection();
  const user = useAuthStore((s) => s.user);

  React.useEffect(() => {
    if (!user) return;

    let unsubRefresh: (() => void) | undefined;
    let unsubMessage: (() => void) | undefined;

    const setup = async () => {
      const token = await requestPermissionAndGetToken();
      if (token) await authRepo.updateFcmToken(token);

      unsubRefresh = onTokenRefresh((t) => authRepo.updateFcmToken(t)).remove;
      unsubMessage = onForegroundMessage((title, body) =>
        Alert.alert(title, body),
      ).remove;
    };

    setup();
    return () => {
      unsubRefresh?.();
      unsubMessage?.();
    };
  }, [user, authRepo]);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthListener />
      <FcmSetup />
      <RootNavigator />
    </QueryClientProvider>
  );
}
