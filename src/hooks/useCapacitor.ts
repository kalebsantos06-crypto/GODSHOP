import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to inspect native Capacitor platform status and capabilities
 */
export function useCapacitor() {
  const [isNative, setIsNative] = useState<boolean>(false);
  const [platform, setPlatform] = useState<string>('web');

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    setPlatform(Capacitor.getPlatform());
  }, []);

  return {
    isNative,
    isAndroid: platform === 'android',
    isIos: platform === 'ios',
    isWeb: platform === 'web',
    platform,
  };
}
