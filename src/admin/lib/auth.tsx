import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { getAdminClient, isSupabaseConfigured } from '@/lib/supabase';

import { db, friendlyError, type Row } from './db';

export type AdminRole = 'super_admin' | 'content_admin';
export type AuthStatus = 'loading' | 'unconfigured' | 'signed-out' | 'not-admin' | 'admin';

export interface AdminProfile {
  id: string;
  auth_user_id: string;
  email: string;
  role: AdminRole;
}

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  admin: AdminProfile | null;
  isSuperAdmin: boolean;
  /** True when the session ended without the user pressing "Sign out" (expired / revoked). */
  sessionExpired: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  updatePassword: (password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  clearExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(!isSupabaseConfigured);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  // Which user id the admin lookup has finished for — avoids a one-render "not an admin" flash when a session appears.
  const [resolvedFor, setResolvedFor] = useState<string | null | undefined>(undefined);
  const [sessionExpired, setSessionExpired] = useState(false);
  const userInitiatedSignOut = useRef(false);
  const hadSession = useRef(false);

  useEffect(() => {
    const client = getAdminClient();
    if (!client) return undefined;
    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      hadSession.current = Boolean(data.session);
      setSessionLoaded(true);
    });
    const { data: sub } = client.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_OUT' && hadSession.current && !userInitiatedSignOut.current) setSessionExpired(true);
      if (event === 'SIGNED_OUT') userInitiatedSignOut.current = false;
      hadSession.current = Boolean(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Look up the admin row after the session is known (never inside the auth callback itself).
  const userId = session?.user.id ?? null;
  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setAdmin(null);
      setResolvedFor(null);
      return undefined;
    }
    db()
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        setAdmin(error ? null : ((data as Row | null) as AdminProfile | null));
        setResolvedFor(userId);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    try {
      const { error } = await db().auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        return { ok: false, error: /invalid login/i.test(error.message) ? 'Incorrect email or password.' : friendlyError(error) };
      }
      setSessionExpired(false);
      // Best-effort audit entry (only recorded for real admins).
      db().rpc('log_admin_login').then(undefined, () => undefined);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: friendlyError(e) };
    }
  }, []);

  const signOut = useCallback(async () => {
    userInitiatedSignOut.current = true;
    await getAdminClient()?.auth.signOut();
  }, []);

  const sendPasswordReset = useCallback<AuthContextValue['sendPasswordReset']>(async (email) => {
    try {
      const { error } = await db().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/admin/reset-password` });
      if (error) return { ok: false, error: friendlyError(error) };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: friendlyError(e) };
    }
  }, []);

  const updatePassword = useCallback<AuthContextValue['updatePassword']>(async (password) => {
    try {
      const { error } = await db().auth.updateUser({ password });
      if (error) return { ok: false, error: friendlyError(error) };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: friendlyError(e) };
    }
  }, []);

  const status: AuthStatus = !isSupabaseConfigured
    ? 'unconfigured'
    : !sessionLoaded || (session && resolvedFor !== userId)
      ? 'loading'
      : !session
        ? 'signed-out'
        : admin
          ? 'admin'
          : 'not-admin';

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      admin,
      isSuperAdmin: admin?.role === 'super_admin',
      sessionExpired,
      signIn,
      signOut,
      sendPasswordReset,
      updatePassword,
      clearExpired: () => setSessionExpired(false),
    }),
    [status, session, admin, sessionExpired, signIn, signOut, sendPasswordReset, updatePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
