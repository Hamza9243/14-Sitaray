/**
 * Web has no native splash screen to hand off from, and layering the same
 * Reanimated-driven overlay here risks the SSR/hydration issues that native
 * `<View>`/text-node mismatches can trigger on react-native-web. Web simply
 * renders straight into the app.
 */
export function AnimatedSplashOverlay() {
  return null;
}
