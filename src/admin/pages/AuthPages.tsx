import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { Icon } from '../components/Icon';
import { Button, Field } from '../components/ui';
import { useAuth } from '../lib/auth';

function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand brand-auth">
          <img className="brand-mark" src="/favicon.png" alt="" />
          <div>
            <strong>14 Stars</strong>
            <span>Content Studio</span>
          </div>
        </div>
        <h1>{title}</h1>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function LoginPage() {
  const { status, signIn, sessionExpired, clearExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/admin/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'admin') navigate(from, { replace: true });
    if (status === 'not-admin') navigate('/admin/access-denied', { replace: true });
  }, [status, from, navigate]);

  if (status === 'unconfigured') return <Navigate to="/admin/setup" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    const res = await signIn(email, password);
    setBusy(false);
    if (!res.ok) setError(res.error);
  }

  return (
    <AuthShell title="Admin sign in" subtitle="Sign in to manage the 14 Stars content.">
      {sessionExpired ? (
        <div className="alert alert-info" role="alert">
          Your session has ended. Please sign in again.{' '}
          <button type="button" className="link" onClick={clearExpired}>
            Dismiss
          </button>
        </div>
      ) : null}
      <form onSubmit={submit} className="stack" noValidate>
        <Field label="Email" htmlFor="login-email">
          <input id="login-email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Field>
        <Field label="Password" htmlFor="login-password">
          <div className="input-group">
            <input id="login-password" className="input" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="icon-btn" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)}>
              <Icon name={show ? 'eye-off' : 'eye'} size={16} />
            </button>
          </div>
        </Field>
        {error ? (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        ) : null}
        <Button type="submit" variant="primary" loading={busy} className="btn-block">
          Login
        </Button>
        <Link className="link center-text" to="/admin/forgot-password">
          Forgot password?
        </Link>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    const res = await sendPasswordReset(email);
    setBusy(false);
    if (res.ok) setDone(true);
    else setError(res.error);
  }

  return (
    <AuthShell title="Reset your password" subtitle="We’ll email you a link to choose a new password.">
      {done ? (
        <div className="alert alert-success" role="status">
          If an account exists for <b>{email}</b>, a reset link is on its way. Check your inbox.
        </div>
      ) : (
        <form onSubmit={submit} className="stack" noValidate>
          <Field label="Email" htmlFor="forgot-email">
            <input id="forgot-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </Field>
          {error ? <div className="alert alert-error">{error}</div> : null}
          <Button type="submit" variant="primary" loading={busy} className="btn-block">
            Send reset link
          </Button>
        </form>
      )}
      <Link className="link center-text" to="/admin/login">
        Back to sign in
      </Link>
    </AuthShell>
  );
}

/** Landing page for the link in the password-reset email (the Supabase session is created from the URL). */
export function ResetPasswordPage() {
  const { status, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The passwords do not match.');
    setBusy(true);
    const res = await updatePassword(password);
    setBusy(false);
    if (res.ok) {
      setDone(true);
      window.setTimeout(() => navigate('/admin/dashboard'), 1200);
    } else setError(res.error);
  }

  if (status === 'loading') return <AuthShell title="One moment…"><span className="spinner" /></AuthShell>;
  if (status === 'signed-out') {
    return (
      <AuthShell title="Link expired" subtitle="This reset link is invalid or has expired.">
        <Link className="btn btn-primary btn-block" to="/admin/forgot-password">
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password">
      {done ? (
        <div className="alert alert-success">Password updated. Redirecting…</div>
      ) : (
        <form onSubmit={submit} className="stack" noValidate>
          <Field label="New password" htmlFor="new-password">
            <input id="new-password" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </Field>
          <Field label="Confirm password" htmlFor="confirm-password">
            <input id="confirm-password" className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {error ? <div className="alert alert-error">{error}</div> : null}
          <Button type="submit" variant="primary" loading={busy} className="btn-block">
            Update password
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export function AccessDeniedPage() {
  const { status, session, signOut } = useAuth();
  if (status === 'signed-out') return <Navigate to="/admin/login" replace />;
  if (status === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return (
    <AuthShell title="Access denied" subtitle="This area is for authorised administrators only.">
      <div className="alert alert-error" role="alert">
        {session?.user.email ? (
          <>
            <b>{session.user.email}</b> is signed in but is not an admin.
          </>
        ) : (
          'You are not authorised to view the dashboard.'
        )}
      </div>
      <p className="muted small">If you should have access, ask a super admin to add your account.</p>
      <Button variant="primary" className="btn-block" onClick={() => void signOut()}>
        Sign out
      </Button>
    </AuthShell>
  );
}

export function SetupPage() {
  return (
    <AuthShell title="Supabase is not configured" subtitle="The dashboard needs a Supabase project.">
      <ol className="steps">
        <li>
          Copy <code>.env.example</code> to <code>.env</code>.
        </li>
        <li>
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> (Project Settings → API).
        </li>
        <li>
          Run <code>supabase/migrations/*.sql</code> and <code>supabase/seed.sql</code> in the Supabase SQL editor.
        </li>
        <li>Restart the dev server / rebuild the app.</li>
      </ol>
    </AuthShell>
  );
}
