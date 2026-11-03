import { Link } from 'react-router-dom';
import { BookA, Calculator as CalcIcon, Timer, Volume2 } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { useT } from '../lib/i18n';

export default function Tools() {
  const t = useT();
  const items = [
    { to: '/tools/timer', icon: Timer, key: 'timer', help: 'timerHelp' },
    { to: '/tools/calculator', icon: CalcIcon, key: 'calculator', help: 'calculatorHelp' },
    { to: '/tools/voice', icon: Volume2, key: 'voice', help: 'voiceHelp' },
    { to: '/glossary', icon: BookA, key: 'glossary', help: 'glossaryHelp' },
  ];
  return (
    <div>
      <PageHeader title={t('tools')} />
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((x) => (
          <li key={x.to}>
            <Link to={x.to} className="card flex h-full items-start gap-4 hover:border-primary-400">
              <x.icon className="mt-1 h-8 w-8 shrink-0 text-primary-700" aria-hidden="true" />
              <span><span className="block text-lg font-bold">{t(x.key)}</span><span className="text-slate-700">{t(x.help)}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
