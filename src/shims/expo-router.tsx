import { useNavigate, useParams } from 'react-router-dom';

/**
 * Drop-in replacement for expo-router's `useRouter`/`useLocalSearchParams`, aliased
 * in vite.config.ts so every screen's `import { useRouter } from 'expo-router'` keeps
 * working unchanged. Only the subset actually used in this app is implemented:
 * `router.push(path)`, `router.push({ pathname, params })` (bracket params filled in),
 * and `router.back()`.
 */
export function useRouter() {
  const navigate = useNavigate();

  function resolve(to: string | { pathname: string; params?: Record<string, string> }): string {
    if (typeof to === 'string') return to;
    return to.pathname.replace(/\[(\w+)\]/g, (_match, key: string) => encodeURIComponent(to.params?.[key] ?? ''));
  }

  return {
    push: (to: string | { pathname: string; params?: Record<string, string> }) => navigate(resolve(to)),
    replace: (to: string | { pathname: string; params?: Record<string, string> }) => navigate(resolve(to), { replace: true }),
    back: () => navigate(-1),
  };
}

export function useLocalSearchParams<T extends Record<string, string | undefined> = Record<string, string>>(): T {
  return useParams() as unknown as T;
}
