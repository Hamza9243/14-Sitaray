import { SplashScreen } from '@capacitor/splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppThemeProvider } from '@/design-system/ThemeProvider';
import { useAppFonts } from '@/design-system/fonts';
import { AppRoutes } from '@/router';

export function App() {
  const [fontsLoaded] = useAppFonts();

  // Capacitor's native splash (capacitor.config.ts sets launchAutoHide: false) covers
  // the raw WebView-loading gap. Handing off exactly when fonts finish loading — the
  // same moment AnimatedSplashOverlay starts rendering the same splash artwork — is
  // what makes the native-to-in-app splash swap invisible. A no-op on the plain web
  // build (there's no native splash to hide there).
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hide();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <AnimatedSplashOverlay />
          <AppRoutes />
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
