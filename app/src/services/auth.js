import * as LocalAuthentication from 'expo-local-authentication';

export async function biometricAvailable() {
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}

export async function biometricAuth(promptMessage = 'Unlock P2Pal') {
  if (!(await biometricAvailable())) return false;
  const r = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Use PIN',
    disableDeviceFallback: true,
  });
  return r.success;
}
