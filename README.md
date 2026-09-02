# 14 Stars

An Islamic children's learning app — the 14 Ma'sumeen, interactive dua lessons, stories, and mini-games. Built with **React + Vite**, rendered through **react-native-web** (most components/screens are unchanged React Native code), packaged for Android/iOS with **Capacitor**.

Migrated from Expo/React Native — see `src/shims/` for the compatibility layer that let almost every existing screen and component move over unchanged.

## Get started

```bash
npm install
npm run dev        # Vite dev server at http://localhost:5173
```

## Building for the browser

```bash
npm run build       # tsc + vite build -> dist/
npm run preview      # serve the production build locally
```

## Building the Android app

```bash
npm run cap:sync     # build + copy the web bundle into android/
npm run cap:android  # cap:sync + open the project in Android Studio
```

Or drive Gradle directly once `android/` exists:

```bash
cd android && ./gradlew assembleDebug
```

No native C++/CMake compilation is involved — Capacitor's Android shell only compiles a handful of small Kotlin/Java plugin files, so this build is fast (unlike the old Expo/Reanimated native build).

## Architecture notes

- **Routing**: `src/router.tsx` (react-router) replaces expo-router's file-based `app/` directory — every screen in `src/screens/` is unchanged.
- **Expo module shims**: `src/shims/` provides drop-in replacements (same import path, same API) for `expo-router`, `@expo/vector-icons`, `expo-linear-gradient`, `expo-image`, `expo-haptics`, `expo-speech`, and `expo-audio`, aliased in `vite.config.ts`. No source file outside `src/shims/`, `src/router.tsx`, `src/App.tsx`, `src/main.tsx`, and `src/components/TabsLayout.tsx` needed to change for the migration.
- **Fonts**: `public/fonts.css` is Google Fonts' own `@font-face` CSS with `font-family` renamed to match the exact PostScript names (`Baloo2_700Bold`, etc.) `src/design-system/tokens/typography.ts` already references — see the comment in `index.html`.
- **State**: `src/hooks/useAppStore.ts` (Zustand + AsyncStorage) is unchanged — `@react-native-async-storage/async-storage` has its own web implementation.

## Known follow-ups

- Haptics only fire inside the Capacitor-wrapped native app (`Capacitor.isNativePlatform()`), not in a plain browser tab — several call sites still guard with `Platform.OS !== 'web'`, which is always true under react-native-web (including inside the Capacitor WebView). Harmless today (haptics just no-op there too), but worth revisiting if haptic feedback is wanted inside the wrapped app.
- The production JS bundle is ~1.7MB minified (Reanimated + gesture-handler + svg pulled in as one chunk) — fine for now, but worth code-splitting per-route if load time becomes a concern.
- `android.expo-backup/` at the repo root is the old Expo-prebuilt native project, kept locally only until confirmed unneeded — safe to delete.
