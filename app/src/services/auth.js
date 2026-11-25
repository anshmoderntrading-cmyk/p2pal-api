import * as LocalAuthentication from 'expo-local-authentication';

export async function biometricAvailable() {
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}

export async function biometricAuth(promptMessage = 'P2Pal unlock karo') {
  if (!(await biometricAvailable())) return false;
  const r = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'PIN use karo',
    disableDeviceFallback: true,
  });
  return r.success;
}
