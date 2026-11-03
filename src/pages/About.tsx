import { ExternalLink } from 'lucide-react';
import { Badge, PageHeader } from '../components/ui';
import { OFFICIAL_LINKS } from '../lib/constants';
import { useT } from '../lib/i18n';
import { AVAILABLE_MODULES, MODULES } from '../lib/modules';

export default function About() {
  const t = useT();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t('about')} />
      <section className="card space-y-2">
        <p>{t('aboutText')}</p>
        <ul className="space-y-1">
          {OFFICIAL_LINKS.map((l) => <li key={l.href}><a className="inline-flex items-center gap-2 font-semibold text-primary-800 underline" href={l.href} target="_blank" rel="noopener noreferrer">{l.label}<ExternalLink className="h-4 w-4" aria-hidden="true" /></a></li>)}
        </ul>
      </section>
      <section className="card space-y-2" aria-labelledby="labels">
        <h2 id="labels" className="text-lg font-bold">{t('labelsTitle')}</h2>
        <p className="flex flex-wrap items-center gap-2"><Badge tone="green">{t('verified')}</Badge>{t('labelVerified')}</p>
        <p className="flex flex-wrap items-center gap-2"><Badge tone="amber">{t('needsVerification')}</Badge>{t('labelNeeds')}</p>
        <p className="flex flex-wrap items-center gap-2"><Badge tone="amber">{t('sample')}</Badge>{t('labelSample')}</p>
      </section>
      <section className="card" aria-labelledby="modules">
        <h2 id="modules" className="mb-1 text-lg font-bold">{t('modulesTitle')}</h2>
        <p className="mb-3 text-sm text-slate-700">{t('modulesHelp')}</p>
        <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2" lang="en">
          {MODULES.map((m, i) => (
            <li key={m} className="flex items-start justify-between gap-2 border-b border-slate-100 py-1">
              <span>{i + 1}. {m}</span>
              {AVAILABLE_MODULES.has(i + 1) ? <Badge tone="green">{t('available')}</Badge> : <Badge>{t('planned')}</Badge>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
