/**
 * Haptic feedback utility for mobile/APK environments.
 * Uses navigator.vibrate if available on the device.
 */
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') {
  if (typeof window === 'undefined' || !('navigator' in window) || !('vibrate' in navigator)) {
    return;
  }

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(20);
        break;
      case 'heavy':
        navigator.vibrate(35);
        break;
      case 'success':
        navigator.vibrate([15, 50, 15]);
        break;
      case 'warning':
        navigator.vibrate([30, 40, 30]);
        break;
    }
  } catch (err) {
    // Ignore if vibration permissions or hardware is restricted
  }
}
