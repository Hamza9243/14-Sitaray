import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Same identity the old Expo build used (android.package in the removed app.json) —
  // keeping it avoids a fresh Play Console listing. Change before a real production
  // release if a proper reverse-DNS package name is wanted instead of the placeholder.
  appId: 'com.anonymous.x14stars',
  appName: '14 Stars',
  webDir: 'dist',
  backgroundColor: '#0B0E2E',
  plugins: {
    SplashScreen: {
      // Held open until src/App.tsx explicitly calls SplashScreen.hide() once fonts
      // and persisted state have finished loading — same "don't flash unready UI"
      // behavior the old Expo build's native splash hand-off had.
      launchAutoHide: false,
      backgroundColor: '#0B0E2E',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
