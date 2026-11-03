import { Link } from 'react-router-dom';
import { BookOpen, Calculator, ExternalLink, Library, ListChecks, Timer, Volume2 } from 'lucide-react';
import { GRADES, OFFICIAL_LINKS } from '../lib/constants';
import { useT } from '../lib/i18n';
import { useAuth } from '../stores/auth';

export default function Home() {
  const t = useT();
  const user = useAuth((s) => s.user);
  const tools = [
    { to: '/library', icon: Library, key: 'library' },
    { to: '/quizzes', icon: ListChecks, key: 'quizzes' },
    { to: '/notes', icon: BookOpen, key: 'notes' },
    { to: '/tools/timer', icon: Timer, key: 'timer' },
    { to: '/tools/calculator', icon: Calculator, key: 'calculator' },
    { to: '/tools/voice', icon: Volume2, key: 'voice' },
  ];
  return (
    <div className="space-y-10">
      <section className="ruled rounded-2xl border border-slate-200 px-6 py-8 pl-[4.5rem] sm:px-10 sm:py-12 sm:pl-24">
        <h1 className="max-w-2xl text-3xl font-bold leading-tight text-primary-900 sm:text-4xl">{t('heroTitle')}</h1>
        <p className="mt-3 max-w-xl text-lg text-slate-800">{t('heroSub')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/library" className="btn btn-primary">{t('browseLibrary')}</Link>
          <Link to="/quizzes" className="btn btn-secondary">{t('practiceQuiz')}</Link>
          {!user && <Link to="/signup" className="btn btn-secondary">{t('signUp')}</Link>}
        </div>
      </section>

      <section aria-labelledby="pick-grade">
        <h2 id="pick-grade" className="mb-3 text-xl font-bold">{t('pickGrade')}</h2>
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-7">
          {GRADES.map((g) => (
            <li key={g}>
              <Link to={`/library?grade=${g}`} className="btn btn-secondary w-full text-lg" aria-label={`${t('grade')} ${g}`}>{g}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="study-tools">
        <h2 id="study-tools" className="mb-3 text-xl font-bold">{t('studyTools')}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((x) => (
            <li key={x.to}>
              <Link to={x.to} className="card flex items-center gap-3 font-semibold hover:border-primary-400">
                <x.icon className="h-7 w-7 text-primary-700" aria-hidden="true" />
                {t(x.key)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="official" className="card">
        <h2 id="official" className="text-xl font-bold">{t('officialLinks')}</h2>
        <ul className="mt-3 space-y-2">
          {OFFICIAL_LINKS.map((l) => (
            <li key={l.href}>
              <a className="inline-flex items-center gap-2 font-semibold text-primary-800 underline" href={l.href} target="_blank" rel="noopener noreferrer">
                {l.label}<ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-slate-700">{t('notOfficial')}</p>
      </section>
    </div>
  );
}
