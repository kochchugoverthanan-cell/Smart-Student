import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { Field, PageHeader } from '../components/ui';
import { useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { useAuth } from '../stores/auth';

type Mode = 'focus' | 'break';
type Status = 'idle' | 'running' | 'paused';
const KEY = 'ssl-pomodoro';

function loadSettings(): { focus: number; brk: number; sound: boolean } {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '{}'); return { focus: clamp(v.focus ?? 25, 1, 180), brk: clamp(v.brk ?? 5, 1, 60), sound: v.sound !== false }; }
  catch { return { focus: 25, brk: 5, sound: true }; }
}
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, Math.round(Number(n) || a)));
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function Pomodoro() {
  const t = useT();
  const user = useAuth((s) => s.user);
  const track = useAuth((s) => s.profile?.track_activity ?? true);
  const [cfg, setCfg] = useState(loadSettings);
  const [mode, setMode] = useState<Mode>('focus');
  const [status, setStatus] = useState<Status>('idle');
  const [left, setLeft] = useState(cfg.focus * 60);
  const [message, setMessage] = useState<string | null>(null);
  const endAt = useRef(0);
  const ctx = useRef<AudioContext | null>(null);
  const startedAt = useRef<string>('');
  const [logSessions, setLogSessions] = useState(true);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* storage may be blocked */ } }, [cfg]);
  // While idle, keep the clock in step with the chosen durations.
  useEffect(() => { if (status === 'idle') setLeft((mode === 'focus' ? cfg.focus : cfg.brk) * 60); }, [cfg.focus, cfg.brk, mode, status]);

  function beep() {
    if (!cfg.sound || !ctx.current) return;
    const c = ctx.current;
    [0, 0.35, 0.7].forEach((d) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.0001, c.currentTime + d); g.gain.exponentialRampToValueAtTime(0.25, c.currentTime + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + d + 0.25);
      o.start(c.currentTime + d); o.stop(c.currentTime + d + 0.3);
    });
  }

  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setLeft(remaining);
      document.title = `${fmt(remaining)} · ${t('timer')}`;
      if (remaining === 0) {
        clearInterval(id);
        beep();
        if (mode === 'focus') {
          setMessage(t('sessionDone'));
          if (user && track && logSessions) void supabase.from('study_sessions').insert({ user_id: user.id, minutes: cfg.focus, started_at: startedAt.current || new Date().toISOString() });
        } else setMessage(t('breakDone'));
        setStatus('idle');
        setMode((m) => (m === 'focus' ? 'break' : 'focus'));
      }
    }, 250);
    return () => clearInterval(id);
  }); // re-created each render so it always sees fresh state; cheap at 4 ticks per second
  useEffect(() => () => { document.title = 'Smart Student Sri Lanka'; }, []);

  function start() {
    if (!ctx.current && cfg.sound) { try { ctx.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { ctx.current = null; } }
    ctx.current?.resume().catch(() => undefined);
    setMessage(null);
    if (status === 'idle') startedAt.current = new Date().toISOString();
    endAt.current = Date.now() + left * 1000;
    setStatus('running');
  }
  const pause = () => { setStatus('paused'); document.title = 'Smart Student Sri Lanka'; };
  const reset = () => { setStatus('idle'); setMessage(null); setLeft((mode === 'focus' ? cfg.focus : cfg.brk) * 60); document.title = 'Smart Student Sri Lanka'; };
  const total = (mode === 'focus' ? cfg.focus : cfg.brk) * 60;
  const pct = Math.round(((total - left) / total) * 100);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title={t('timer')} />
      <div className="card text-center">
        <p className="text-lg font-semibold text-slate-700">{mode === 'focus' ? t('focusTime') : t('breakTime')}</p>
        <p className="my-2 text-6xl font-bold tabular-nums text-primary-900" role="timer" aria-label={fmt(left)}>{fmt(left)}</p>
        <div className="mx-auto mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t('timer')}><div className="h-full bg-primary-600" style={{ width: `${pct}%` }} /></div>
        {message && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-lg font-semibold text-green-900">{message}</p>}
        <div className="flex flex-wrap justify-center gap-3">
          {status === 'idle' && <button type="button" className="btn btn-primary" onClick={start}><Play className="h-5 w-5" aria-hidden="true" />{t('start')}</button>}
          {status === 'running' && <button type="button" className="btn btn-primary" onClick={pause}><Pause className="h-5 w-5" aria-hidden="true" />{t('pause')}</button>}
          {status === 'paused' && <button type="button" className="btn btn-primary" onClick={start}><Play className="h-5 w-5" aria-hidden="true" />{t('resume')}</button>}
          <button type="button" className="btn btn-secondary" onClick={reset}><RotateCcw className="h-5 w-5" aria-hidden="true" />{t('reset')}</button>
          <button type="button" aria-pressed={!cfg.sound} className="btn btn-secondary" onClick={() => setCfg({ ...cfg, sound: !cfg.sound })}>
            {cfg.sound ? <Volume2 className="h-5 w-5" aria-hidden="true" /> : <VolumeX className="h-5 w-5" aria-hidden="true" />}{cfg.sound ? t('mute') : t('soundOn')}
          </button>
        </div>
      </div>
      <div className="card mt-4 grid grid-cols-2 gap-4">
        <Field label={t('focusMinutes')}><input className="input" type="number" min={1} max={180} value={cfg.focus} disabled={status !== 'idle'} onChange={(e) => setCfg({ ...cfg, focus: clamp(Number(e.target.value), 1, 180) })} /></Field>
        <Field label={t('breakMinutes')}><input className="input" type="number" min={1} max={60} value={cfg.brk} disabled={status !== 'idle'} onChange={(e) => setCfg({ ...cfg, brk: clamp(Number(e.target.value), 1, 60) })} /></Field>
        {user && track && (
          <label className="col-span-2 flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1.5 h-5 w-5" checked={logSessions} onChange={(e) => setLogSessions(e.target.checked)} /><span>{t('logSessions')}</span></label>
        )}
        {!user && <p className="col-span-2 text-sm text-slate-700">{t('timerNoSignIn')}</p>}
      </div>
    </div>
  );
}
