import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GRADES, LANGUAGES, MEDIUMS } from '../lib/constants';
import { useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import type { Lang } from '../lib/types';
import { Field, PageHeader } from '../components/ui';
import { useAuth } from '../stores/auth';
import { useSettings } from '../stores/settings';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Errors({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-lg bg-red-50 p-3 font-semibold text-red-900">{message}</p>;
}

export function SignIn() {
  const t = useT();
  const nav = useNavigate();
  const loc = useLocation();
  const user = useAuth((s) => s.user);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const from = (loc.state as { from?: string } | null)?.from ?? '/dashboard';

  useEffect(() => { if (user) nav(from, { replace: true }); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) return setError(t('emailInvalid'));
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(t('signInFailed'));
  }
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={t('signIn')} />
      <form onSubmit={submit} className="card space-y-4" noValidate>
        <Errors message={error} />
        <Field label={t('email')}><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label={t('password')}><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? t('loading') : t('signIn')}</button>
        <p className="text-center"><Link className="underline" to="/forgot-password">{t('forgotPassword')}</Link></p>
        <p className="text-center">{t('noAccount')} <Link className="font-semibold underline" to="/signup">{t('signUp')}</Link></p>
      </form>
    </div>
  );
}

export function SignUp() {
  const t = useT();
  const nav = useNavigate();
  const user = useAuth((s) => s.user);
  const uiLang = useSettings((s) => s.language);
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '', grade: '', medium: '', language: uiLang as Lang });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => { if (user) nav('/dashboard', { replace: true }); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(f.email.trim())) return setError(t('emailInvalid'));
    if (f.password.length < 8) return setError(t('passwordShort'));
    if (f.password !== f.confirm) return setError(t('passwordMismatch'));
    setBusy(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: f.email.trim(),
      password: f.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: f.name.trim(), grade: f.grade, medium: f.medium, language: f.language },
      },
    });
    setBusy(false);
    if (err) return setError(err.message);
    if (!data.session) setDone(true);
  }
  if (done) {
    return (
      <div className="mx-auto max-w-md"><div role="status" className="card"><h1 className="text-xl font-bold">{t('signUp')}</h1><p className="mt-2">{t('checkEmail')}</p><Link to="/signin" className="btn btn-primary mt-4">{t('signIn')}</Link></div></div>
    );
  }
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={t('signUp')} />
      <form onSubmit={submit} className="card space-y-4" noValidate>
        <Errors message={error} />
        <Field label={t('displayName')} hint={t('optional')}><input className="input" value={f.name} maxLength={80} onChange={(e) => set('name', e.target.value)} autoComplete="given-name" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('grade')}>
            <select className="input" value={f.grade} onChange={(e) => set('grade', e.target.value)}>
              <option value="">{t('select')}</option>
              {GRADES.map((g) => <option key={g} value={g}>{t('grade')} {g}</option>)}
            </select>
          </Field>
          <Field label={t('medium')}>
            <select className="input" value={f.medium} onChange={(e) => set('medium', e.target.value)}>
              <option value="">{t('select')}</option>
              {MEDIUMS.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label={t('language')}>
          <select className="input" value={f.language} onChange={(e) => set('language', e.target.value)}>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </Field>
        <Field label={t('email')}><input className="input" type="email" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} required /></Field>
        <Field label={t('password')} hint={t('passwordShort')}><input className="input" type="password" autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} required /></Field>
        <Field label={t('confirmPassword')}><input className="input" type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => set('confirm', e.target.value)} required /></Field>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? t('loading') : t('signUp')}</button>
        <p className="text-center">{t('haveAccount')} <Link className="font-semibold underline" to="/signin">{t('signIn')}</Link></p>
      </form>
    </div>
  );
}

export function ForgotPassword() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) return setError(t('emailInvalid'));
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    setSent(true); // Same message whether or not the email has an account.
  }
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={t('forgotPassword')} />
      <form onSubmit={submit} className="card space-y-4" noValidate>
        <Errors message={error} />
        {sent && <p role="status" className="rounded-lg bg-green-50 p-3 text-green-900">{t('resetSent')}</p>}
        <Field label={t('email')}><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <button className="btn btn-primary w-full" disabled={busy}>{t('sendReset')}</button>
      </form>
    </div>
  );
}

export function ResetPassword() {
  const t = useT();
  const nav = useNavigate();
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError(t('passwordShort'));
    if (pw !== pw2) return setError(t('passwordMismatch'));
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) return setError(err.message);
    useAuth.setState({ recovery: false });
    toast.success(t('passwordUpdated'));
    nav('/dashboard', { replace: true });
  }
  if (!loading && !user) {
    return <div className="mx-auto max-w-md"><div role="alert" className="card"><p>{t('resetNeedsLink')}</p><Link to="/forgot-password" className="btn btn-primary mt-3">{t('sendReset')}</Link></div></div>;
  }
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={t('newPassword')} />
      <form onSubmit={submit} className="card space-y-4" noValidate>
        <Errors message={error} />
        <Field label={t('newPassword')}><input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Field label={t('confirmPassword')}><input className="input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
        <button className="btn btn-primary w-full" disabled={busy}>{t('updatePassword')}</button>
      </form>
    </div>
  );
}

/** Forced password change for the first administrator (English only: administrators' screen). */
export function ChangePassword() {
  const nav = useNavigate();
  const user = useAuth((s) => s.user);
  const mustChange = useAuth((s) => s.mustChangePassword);
  const refresh = useAuth((s) => s.refreshProfile);
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user?.email) return;
    if (pw.length < 12) return setError('The new password must be at least 12 characters.');
    if (pw === cur) return setError('The new password must be different from the temporary password.');
    if (pw !== pw2) return setError('The new passwords do not match.');
    setBusy(true);
    const check = await supabase.auth.signInWithPassword({ email: user.email, password: cur });
    if (check.error) { setBusy(false); return setError('The temporary password is not correct.'); }
    const upd = await supabase.auth.updateUser({ password: pw });
    if (upd.error) { setBusy(false); return setError(upd.error.message); }
    const done = await supabase.rpc('complete_forced_password_change');
    setBusy(false);
    if (done.error || done.data !== true) return setError('The password change could not be confirmed. Please try again.');
    await refresh();
    toast.success('Password changed. Administrator access is now active.');
    nav('/admin', { replace: true });
  }
  if (!mustChange) return <div className="card mx-auto max-w-md"><p>You do not need to change your password right now.</p><Link className="btn btn-primary mt-3" to="/dashboard">Dashboard</Link></div>;
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Choose a new password" subtitle="Administrator access stays locked until you replace the temporary password." />
      <form onSubmit={submit} className="card space-y-4" noValidate>
        <Errors message={error} />
        <Field label="Temporary password"><input className="input" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
        <Field label="New password (12+ characters)"><input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Field label="Confirm new password"><input className="input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
        <button className="btn btn-primary w-full" disabled={busy}>Change password</button>
      </form>
    </div>
  );
}

/** One-time first-administrator setup. The function itself refuses to run twice. English only. */
export function SetupAdmin() {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  async function run(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setResult(null);
    const { data, error } = await supabase.functions.invoke('setup-admin', { headers: { 'x-setup-token': token } });
    setBusy(false);
    if (error) {
      let msg = error.message;
      try { const body = await (error as unknown as { context: Response }).context.json(); if (body?.error) msg = body.error; } catch { /* keep default */ }
      return setResult({ ok: false, text: msg });
    }
    setResult({ ok: true, text: (data as { message?: string })?.message ?? 'Done.' });
  }
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="First administrator setup" subtitle="Works once. Needs the setup token you stored as a server secret." />
      <form onSubmit={run} className="card space-y-4">
        {result && <p role={result.ok ? 'status' : 'alert'} className={`rounded-lg p-3 font-semibold ${result.ok ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>{result.text}</p>}
        <Field label="Setup token"><input className="input" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" required /></Field>
        <button className="btn btn-primary w-full" disabled={busy || !token}>Create administrator</button>
      </form>
    </div>
  );
}
