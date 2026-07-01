import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestPermissionAndGetToken(): Promise<string | null> {
  if (isExpoGo) return null;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;

  const token = await Notifications.getDevicePushTokenAsync();
  return token.data as string;
}

export function onTokenRefresh(cb: (token: string) => void) {
  return Notifications.addPushTokenListener((t) => cb(t.data as string));
}

export function onForegroundMessage(cb: (title: string, body: string) => void) {
  return Notifications.addNotificationReceivedListener((n) => {
    cb(
      n.request.content.title ?? 'Notificación',
      n.request.content.body ?? '',
    );
  });
}
