import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { GraduationCap, Menu, X } from 'lucide-react';
import { useT } from '../lib/i18n';
import { useAuth } from '../stores/auth';
import { DisplayMenu, LanguageSwitcher } from './SettingsControls';

interface InstallEvent extends Event { prompt: () => Promise<void> }

export default function Layout() {
  const t = useT();
  const user = useAuth((s) => s.user);
  const isAdmin = useAuth((s) => s.isAdmin);
  const signOut = useAuth((s) => s.signOut);
  const [open, setOpen] = useState(false);
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);
  const loc = useLocation();

  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setInstallEvt(e as InstallEvent); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  const links = [
    { to: '/', key: 'home', end: true },
    { to: '/library', key: 'library' },
    { to: '/notes', key: 'notes' },
    { to: '/quizzes', key: 'quizzes' },
    { to: '/planner', key: 'planner' },
    { to: '/tools', key: 'tools' },
    ...(user ? [{ to: '/dashboard', key: 'dashboard' }, { to: '/progress', key: 'progress' }] : []),
    ...(isAdmin ? [{ to: '/admin', key: 'admin' }] : []),
  ];
  const cls = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 font-semibold ${isActive ? 'bg-primary-100 text-primary-900' : 'text-slate-800 hover:bg-slate-100'}`;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only-focusable z-50 bg-white p-3 font-semibold text-primary-800">{t('skip')}</a>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-primary-800">
            <GraduationCap className="h-7 w-7" aria-hidden="true" />
            <span>{t('appName')}</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSwitcher />
            <DisplayMenu />
            {user ? (
              <>
                <Link to="/profile" className="btn btn-secondary hidden sm:inline-flex">{t('profile')}</Link>
                <button type="button" className="btn btn-secondary" onClick={() => void signOut()}>{t('signOut')}</button>
              </>
            ) : (
              <>
                <Link to="/signin" className="btn btn-secondary">{t('signIn')}</Link>
                <Link to="/signup" className="btn btn-primary hidden sm:inline-flex">{t('signUp')}</Link>
              </>
            )}
            <button
              type="button" className="btn btn-secondary lg:hidden" aria-expanded={open} aria-controls="main-nav"
              aria-label={t('menu')} onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
        <nav id="main-nav" aria-label={t('menu')} className={`${open ? 'block' : 'hidden'} border-t border-slate-100 lg:block`}>
          <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-2 lg:flex-row lg:flex-wrap">
            {links.map((l) => (
              <li key={l.to}><NavLink to={l.to} end={l.end} className={cls}>{t(l.key)}</NavLink></li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 outline-none">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-slate-700">
          <p className="max-w-xl">{t('notOfficial')}</p>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <li><Link className="underline" to="/about">{t('about')}</Link></li>
            <li><Link className="underline" to="/feedback">{t('feedback')}</Link></li>
            <li><Link className="underline" to="/privacy">{t('privacy')}</Link></li>
            {installEvt && (
              <li>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { void installEvt.prompt(); setInstallEvt(null); }}>
                  {t('install')}
                </button>
              </li>
            )}
          </ul>
        </div>
      </footer>
    </div>
  );
}
