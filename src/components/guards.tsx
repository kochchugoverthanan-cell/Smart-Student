import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useT } from '../lib/i18n';
import { useAuth } from '../stores/auth';
import { Spinner } from './ui';

export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  const mustChange = useAuth((s) => s.mustChangePassword);
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/signin" replace state={{ from: loc.pathname + loc.search }} />;
  if (mustChange && loc.pathname !== '/change-password') return <Navigate to="/change-password" replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const isAdmin = useAuth((s) => s.isAdmin);
  const loading = useAuth((s) => s.loading);
  if (loading) return <Spinner />;
  if (!isAdmin) {
    return (
      <div role="alert" className="card mx-auto max-w-lg text-center">
        <ShieldAlert className="mx-auto mb-2 h-10 w-10 text-red-700" aria-hidden="true" />
        <h1 className="text-xl font-bold">Not authorised</h1>
        <p className="mt-1 text-slate-700">This area is only for administrators.</p>
        <Link to="/" className="btn btn-primary mt-4">Home</Link>
      </div>
    );
  }
  return <>{children}</>;
}

/** Shown inside pages that are partly open to everyone but need an account for personal features. */
export function SignInPrompt() {
  const t = useT();
  return (
    <div className="card text-center">
      <p className="mb-3">{t('signInNeeded')}</p>
      <div className="flex justify-center gap-3">
        <Link to="/signin" className="btn btn-primary">{t('signIn')}</Link>
        <Link to="/signup" className="btn btn-secondary">{t('signUp')}</Link>
      </div>
    </div>
  );
}
