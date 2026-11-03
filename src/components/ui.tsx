import type { ReactNode } from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { useT } from '../lib/i18n';
import type { Verification } from '../lib/types';

export function Spinner({ label }: { label?: string }) {
  const t = useT();
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-10 text-slate-700">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      <span>{label ?? t('loading')}</span>
    </div>
  );
}

export function Async({ loading, error, empty, emptyText, onRetry, children }: {
  loading: boolean; error: string | null; empty?: boolean; emptyText?: string; onRetry?: () => void; children: ReactNode;
}) {
  const t = useT();
  if (loading) return <Spinner />;
  if (error) {
    return (
      <div role="alert" className="card flex items-start gap-3 border-red-300 bg-red-50 text-red-900">
        <AlertCircle className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">{t('errorGeneric')}</p>
          <p className="text-sm">{error}</p>
          {onRetry && <button type="button" className="btn btn-secondary mt-3" onClick={onRetry}>{t('retry')}</button>}
        </div>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="card text-center text-slate-700">
        <Inbox className="mx-auto mb-2 h-8 w-8" aria-hidden="true" />
        <p>{emptyText ?? t('noResults')}</p>
      </div>
    );
  }
  return <>{children}</>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-slate-600">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-primary-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-prose text-slate-700">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Badge({ tone = 'slate', children }: { tone?: 'slate' | 'green' | 'amber' | 'blue' | 'red'; children: ReactNode }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-800', green: 'bg-green-100 text-green-900', amber: 'bg-amber-100 text-amber-900',
    blue: 'bg-primary-100 text-primary-900', red: 'bg-red-100 text-red-900',
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export function VerificationBadge({ v }: { v: Verification }) {
  const t = useT();
  if (v === 'verified') return <Badge tone="green">{t('verified')}</Badge>;
  if (v === 'sample') return <Badge tone="amber">{t('sample')}</Badge>;
  return <Badge tone="amber">{t('needsVerification')}</Badge>;
}
