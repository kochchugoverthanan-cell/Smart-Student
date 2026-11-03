import { Link } from 'react-router-dom';
import { BellRing } from 'lucide-react';
import { Async, Badge, PageHeader } from '../components/ui';
import { daysUntil } from '../lib/constants';
import { useLoad } from '../lib/hooks';
import { useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import type { Resource, Task } from '../lib/types';
import { useAuth } from '../stores/auth';
import { useSubjectName } from '../stores/catalog';

type LibRow = { resource_id: string; is_favourite: boolean; is_bookmarked: boolean; last_opened_at: string | null; resources: Pick<Resource, 'id' | 'title' | 'grade' | 'subject_id'> | null };

export default function Dashboard() {
  const t = useT();
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const sName = useSubjectName();

  const { data, loading, error, reload } = useLoad(async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [lib, tasks, attempts, sessions] = await Promise.all([
      supabase.from('user_library').select('resource_id,is_favourite,is_bookmarked,last_opened_at,resources(id,title,grade,subject_id)').order('last_opened_at', { ascending: false, nullsFirst: false }).limit(40),
      supabase.from('tasks').select('*').eq('completed', false).order('due_date', { ascending: true, nullsFirst: false }).limit(6),
      supabase.from('quiz_attempts').select('score,total').order('created_at', { ascending: false }).limit(50),
      supabase.from('study_sessions').select('minutes').gte('started_at', weekAgo),
    ]);
    for (const r of [lib, tasks, attempts, sessions]) if (r.error) throw new Error(r.error.message);
    const att = (attempts.data ?? []) as { score: number; total: number }[];
    const pct = att.length ? Math.round((att.reduce((a, x) => a + (x.total ? x.score / x.total : 0), 0) / att.length) * 100) : null;
    return {
      lib: (lib.data ?? []) as unknown as LibRow[],
      tasks: (tasks.data ?? []) as Task[],
      quizzes: att.length,
      avg: pct,
      minutes: ((sessions.data ?? []) as { minutes: number }[]).reduce((a, x) => a + x.minutes, 0),
    };
  }, [user?.id]);

  const name = profile?.display_name?.trim();
  const mySubjects = profile?.subject_ids ?? [];
  const recent = (data?.lib ?? []).filter((r) => r.last_opened_at && r.resources).slice(0, 5);
  const saved = (data?.lib ?? []).filter((r) => (r.is_favourite || r.is_bookmarked) && r.resources).slice(0, 5);
  const soon = (data?.tasks ?? []).filter((x) => x.due_date && daysUntil(x.due_date) <= 1);

  return (
    <div>
      <PageHeader title={`${t('welcome')}${name ? `, ${name}` : ''}`} />
      {profile && (!profile.grade || mySubjects.length === 0) && (
        <p className="card mb-4 border-primary-300 bg-primary-50">{t('chooseGradeFirst')} <Link className="font-semibold underline" to="/profile">{t('profile')}</Link></p>
      )}
      {profile?.reminders && soon.length > 0 && (
        <div role="status" className="card mb-4 flex items-start gap-3 border-amber-300 bg-amber-50">
          <BellRing className="mt-1 h-5 w-5 text-amber-800" aria-hidden="true" />
          <div><p className="font-semibold">{t('dueSoon')}</p><ul className="list-disc pl-5">{soon.map((x) => <li key={x.id}>{x.title}</li>)}</ul></div>
        </div>
      )}
      <Async loading={loading} error={error} onRetry={reload}>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card" aria-labelledby="d-subjects">
            <h2 id="d-subjects" className="mb-2 text-lg font-bold">{t('mySubjects')}</h2>
            {mySubjects.length === 0 ? <p className="text-slate-700">{t('none')}</p> : (
              <ul className="flex flex-wrap gap-2">
                {mySubjects.map((id) => <li key={id}><Link className="btn btn-secondary btn-sm" to={`/library?subject=${id}${profile?.grade ? `&grade=${profile.grade}` : ''}`}>{sName(id)}</Link></li>)}
              </ul>
            )}
          </section>
          <section className="card" aria-labelledby="d-progress">
            <h2 id="d-progress" className="mb-2 text-lg font-bold">{t('studyProgress')}</h2>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div><dd className="text-2xl font-bold text-primary-800">{data?.quizzes ?? 0}</dd><dt className="text-sm text-slate-700">{t('quizzesTaken')}</dt></div>
              <div><dd className="text-2xl font-bold text-primary-800">{data?.avg === null || data?.avg === undefined ? '–' : `${data.avg}%`}</dd><dt className="text-sm text-slate-700">{t('averageScore')}</dt></div>
              <div><dd className="text-2xl font-bold text-primary-800">{data?.minutes ?? 0}</dd><dt className="text-sm text-slate-700">{t('focusMinutesWeek')}</dt></div>
            </dl>
          </section>
          <section className="card" aria-labelledby="d-recent">
            <h2 id="d-recent" className="mb-2 text-lg font-bold">{t('recentResources')}</h2>
            <ResList rows={recent} sName={sName} empty={t('none')} />
          </section>
          <section className="card" aria-labelledby="d-saved">
            <h2 id="d-saved" className="mb-2 text-lg font-bold">{t('savedResources')}</h2>
            <ResList rows={saved} sName={sName} empty={t('none')} />
          </section>
          <section className="card lg:col-span-2" aria-labelledby="d-tasks">
            <div className="mb-2 flex items-center justify-between"><h2 id="d-tasks" className="text-lg font-bold">{t('upcomingTasks')}</h2><Link className="underline" to="/planner">{t('planner')}</Link></div>
            {(data?.tasks ?? []).length === 0 ? <p className="text-slate-700">{t('none')}</p> : (
              <ul className="divide-y divide-slate-100">
                {(data?.tasks ?? []).map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="font-semibold">{x.title}</span>
                    <span className="flex gap-2">{x.subject_id && <Badge tone="blue">{sName(x.subject_id)}</Badge>}{x.due_date && <Badge tone={daysUntil(x.due_date) < 0 ? 'red' : 'slate'}>{x.due_date}</Badge>}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </Async>
    </div>
  );
}

function ResList({ rows, sName, empty }: { rows: LibRow[]; sName: (id?: string | null) => string; empty: string }) {
  const t = useT();
  if (rows.length === 0) return <p className="text-slate-700">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((r) => (
        <li key={r.resource_id} className="py-2">
          <Link className="font-semibold text-primary-800 underline" to={`/library/${r.resource_id}`}>{r.resources?.title}</Link>
          <p className="text-sm text-slate-700">{t('grade')} {r.resources?.grade} · {sName(r.resources?.subject_id)}</p>
        </li>
      ))}
    </ul>
  );
}
