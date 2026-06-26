import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { useUIStore } from '../store/useUIStore';

const SafeSecureStore = {
  getItemAsync: async (key: string) => {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  }
};

/**
 * Wraps an action with biometric authentication.
 * Checks the user's `requireBiometrics` preference first.
 * If authentication fails or is cancelled, a toast is shown and the action is aborted.
 */
export const withBiometricAuth = async (action: () => void | Promise<void>) => {
  try {
    const requireBiometricsStr = await SafeSecureStore.getItemAsync('requireBiometrics');
    const isRequired = requireBiometricsStr === 'true';

    if (!isRequired || Platform.OS === 'web') {
      return await action();
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate for sensitive action',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return await action();
      } else {
        useUIStore.getState().showToast('Security Denied', 'error');
      }
    } else {
      // If hardware isn't available or not enrolled but it was required, we allow it to proceed 
      // or we can deny it. Usually, if it's required but unconfigured on the OS level, 
      // we might deny or allow. Let's deny for strict security, or let it pass if they can't.
      // The instructions say: "If it fails or is canceled, it shows a 'Security Denied' toast".
      useUIStore.getState().showToast('Biometrics not configured on device', 'error');
    }
  } catch (error) {
    console.error("Biometric auth error:", error);
    useUIStore.getState().showToast('Security Denied', 'error');
  }
};
