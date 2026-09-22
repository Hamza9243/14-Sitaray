import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

/** False until VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set — the child app then runs on its bundled content. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/**
 * The child app's client: always anonymous and never persists a session. Even if an admin is signed
 * in to /admin in the same browser, the child app keeps reading exactly what the public sees
 * (published content only).
 */
export function getPublicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  publicClient ??= createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return publicClient;
}

/** The admin dashboard's client: persists its own session under a separate storage key. */
export function getAdminClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  adminClient ??= createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'sb-14stars-admin-auth',
    },
  });
  return adminClient;
}

/** Public URL of a file in one of the CMS storage buckets (buckets are public-read). */
export function storagePublicUrl(bucket: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
}
