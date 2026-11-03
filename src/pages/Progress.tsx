import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Async, PageHeader } from '../components/ui';
import { unwrap, useLoad } from '../lib/hooks';
import { useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import type { QuizAttempt } from '../lib/types';
import { useAuth } from '../stores/auth';
import { useSubjectName } from '../stores/catalog';
import { showAnswer } from './Quizzes';

export default function Progress() {
  const t = useT();
  const user = useAuth((s) => s.user)!;
  const sName = useSubjectName();
  const { data, loading, error, reload } = useLoad(async () => {
    const attempts = unwrap<QuizAttempt[]>(await supabase.from('quiz_attempts').select('*').order('created_at', { ascending: false }).limit(100));
    const sessions = unwrap<{ id: string; minutes: number; started_at: string }[]>(await supabase.from('study_sessions').select('id,minutes,started_at').order('started_at', { ascending: false }).limit(60));
    return { attempts, sessions };
  }, [user.id]);

  const attempts = data?.attempts ?? [];
  // Report by subject and grade
  const groups = new Map<string, { subject: string; grade: number | null; n: number; pct: number }>();
  for (const a of attempts) {
    const key = `${a.subject_id ?? '-'}|${a.grade ?? '-'}`;
    const g = groups.get(key) ?? { subject: sName(a.subject_id), grade: a.grade, n: 0, pct: 0 };
    g.n += 1; g.pct += a.total ? (a.score / a.total) * 100 : 0; groups.set(key, g);
  }
  // Mistakes notebook: latest wrong answer for each question
  const seen = new Set<string>();
  const mistakes: { quiz: string; quizId: string | null; a: QuizAttempt['answers'][number] }[] = [];
  for (const at of attempts) for (const a of at.answers) {
    if (!a.correct && !seen.has(a.question_id)) { seen.add(a.question_id); mistakes.push({ quiz: at.quiz_title, quizId: at.quiz_id, a }); }
  }
  const totalMinutes = (data?.sessions ?? []).reduce((s, x) => s + x.minutes, 0);

  async function clear(table: 'quiz_attempts' | 'study_sessions') {
    if (!window.confirm(t('confirmDelete'))) return;
    const { error: err } = await supabase.from(table).delete().eq('user_id', user.id);
    if (err) return toast.error(err.message);
    toast.success(t('deleted')); reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('progress')} subtitle={t('progressPrivate')} />
      <Async loading={loading} error={error} onRetry={reload}>
        <section className="card" aria-labelledby="p-report">
          <h2 id="p-report" className="mb-2 text-lg font-bold">{t('reportBySubject')}</h2>
          {groups.size === 0 ? <p className="text-slate-700">{t('none')}</p> : (
            <div className="overflow-x-auto"><table className="w-full text-left">
              <thead><tr className="border-b border-slate-200"><th className="py-2 pr-4">{t('subject')}</th><th className="pr-4">{t('grade')}</th><th className="pr-4">{t('quizzesTaken')}</th><th>{t('averageScore')}</th></tr></thead>
              <tbody>{[...groups.values()].map((g, i) => <tr key={i} className="border-b border-slate-100"><td className="py-2 pr-4">{g.subject || '—'}</td><td className="pr-4">{g.grade ?? '—'}</td><td className="pr-4">{g.n}</td><td>{Math.round(g.pct / g.n)}%</td></tr>)}</tbody>
            </table></div>
          )}
        </section>

        <section className="card" aria-labelledby="p-mistakes">
          <h2 id="p-mistakes" className="mb-1 text-lg font-bold">{t('mistakes')}</h2>
          <p className="mb-3 text-sm text-slate-700">{t('mistakesHelp')}</p>
          {mistakes.length === 0 ? <p className="text-slate-700">{t('none')}</p> : (
            <ul className="space-y-3">
              {mistakes.slice(0, 50).map((m) => (
                <li key={m.a.question_id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-semibold">{m.a.prompt}</p>
                  <p className="text-sm text-red-800">{t('yourAnswer')}: {showAnswer(t, m.a.qtype, m.a.given)}</p>
                  <p className="text-sm text-green-800">{t('correctAnswer')}: {showAnswer(t, m.a.qtype, m.a.expected)}</p>
                  {m.a.explanation && <p className="text-sm text-slate-700">{t('explanation')}: {m.a.explanation}</p>}
                  {m.quizId && <Link className="text-sm underline" to={`/quizzes/${m.quizId}`}>{m.quiz}</Link>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="p-history">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 id="p-history" className="text-lg font-bold">{t('history')}</h2>{attempts.length > 0 && <button type="button" className="btn btn-secondary btn-sm" onClick={() => void clear('quiz_attempts')}>{t('clearHistory')}</button>}</div>
          {attempts.length === 0 ? <p className="text-slate-700">{t('none')}</p> : (
            <ul className="divide-y divide-slate-100">{attempts.slice(0, 30).map((a) => <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{a.quiz_title}</span><span className="font-semibold">{a.score}/{a.total} · {a.created_at.slice(0, 10)}</span></li>)}</ul>
          )}
        </section>

        <section className="card" aria-labelledby="p-focus">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 id="p-focus" className="text-lg font-bold">{t('focusLog')}</h2>{(data?.sessions ?? []).length > 0 && <button type="button" className="btn btn-secondary btn-sm" onClick={() => void clear('study_sessions')}>{t('clearHistory')}</button>}</div>
          {(data?.sessions ?? []).length === 0 ? <p className="text-slate-700">{t('none')}</p> : (
            <>
              <p className="mb-2">{t('focusTotal', { n: totalMinutes })}</p>
              <ul className="divide-y divide-slate-100">{(data?.sessions ?? []).slice(0, 15).map((s) => <li key={s.id} className="flex justify-between py-1.5"><span>{s.started_at.slice(0, 16).replace('T', ' ')}</span><span>{s.minutes} min</span></li>)}</ul>
            </>
          )}
        </section>
      </Async>
    </div>
  );
}
