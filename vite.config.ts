import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// react-native-web + Vite: RN packages ship JSX inside plain `.js` files and rely on
// Metro's platform-extension resolution (`foo.web.js` wins over `foo.js`). Vite/esbuild
// don't do either by default, so both are configured explicitly below.
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['react-native-worklets/plugin'],
      },
    }),
  ],
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      // These packages are Expo/native-only and have no meaningful equivalent under a
      // plain Vite build — each is replaced by a same-API shim in src/shims/ (web APIs,
      // or a Capacitor plugin where actual native behavior is needed), so every screen's
      // `import { X } from 'expo-*'` keeps working completely unchanged.
      { find: 'expo-router', replacement: path.resolve(__dirname, './src/shims/expo-router.tsx') },
      { find: '@expo/vector-icons', replacement: path.resolve(__dirname, './src/shims/vector-icons.tsx') },
      { find: 'expo-linear-gradient', replacement: path.resolve(__dirname, './src/shims/expo-linear-gradient.tsx') },
      { find: 'expo-image', replacement: path.resolve(__dirname, './src/shims/expo-image.tsx') },
      { find: 'expo-haptics', replacement: path.resolve(__dirname, './src/shims/expo-haptics.ts') },
      { find: 'expo-speech', replacement: path.resolve(__dirname, './src/shims/expo-speech.ts') },
      { find: 'expo-audio', replacement: path.resolve(__dirname, './src/shims/expo-audio.ts') },
      // Order matters: aliases are matched first-hit-wins, and a plain '@' entry matches
      // any '@/...' path as a prefix — so the more specific '@/assets' must be listed
      // before the general '@' catch-all, or every '@/assets/...' import silently
      // resolves under src/ instead (a real image import there just 404s at build time,
      // which is how this got caught) instead of the project-root assets/ folder.
      { find: '@/assets', replacement: path.resolve(__dirname, './assets') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
      resolveExtensions: ['.web.js', '.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    include: [
      'react-native-web',
      'react-native-reanimated',
      'react-native-gesture-handler',
      'react-native-safe-area-context',
      'react-native-svg',
    ],
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
