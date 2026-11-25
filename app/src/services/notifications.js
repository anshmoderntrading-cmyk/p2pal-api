// Push notifications: "USDT receive hua" alerts.
// Expo push → Android pe Firebase (FCM) use karta hai. EAS me FCM credentials upload karne honge.
// Server ko SIRF public addresses jaate hain — keys kabhi nahi.
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ENV } from '../config/env';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPush(addresses) {
  try {
    if (!Device.isDevice) return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Transactions',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await fetch(`${ENV.API_BASE_URL}/notify/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushToken, evm: addresses.evm, tron: addresses.tron }),
    });
    return pushToken;
  } catch {
    return null; // notifications optional hain, app chalti rahe
  }
}
