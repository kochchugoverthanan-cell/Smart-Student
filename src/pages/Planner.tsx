import { FormEvent, useState } from 'react';
import { Check, Trash2, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Async, Badge, Field, PageHeader } from '../components/ui';
import { PRIORITIES, daysUntil, localeFor, todayStr } from '../lib/constants';
import { unwrap, useLoad } from '../lib/hooks';
import { useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import type { Exam, Task, TimetableSlot } from '../lib/types';
import { useAuth } from '../stores/auth';
import { subjectName, useSubjectName, useTopSubjects } from '../stores/catalog';
import { useSettings } from '../stores/settings';

type Tab = 'tasks' | 'timetable' | 'exams';

export default function Planner() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('tasks');
  const tabs: Tab[] = ['tasks', 'timetable', 'exams'];
  return (
    <div>
      <PageHeader title={t('planner')} />
      <div role="tablist" className="mb-4 flex flex-wrap gap-2">
        {tabs.map((k) => <button key={k} type="button" role="tab" aria-selected={tab === k} className="tab" onClick={() => setTab(k)}>{t('tab_' + k)}</button>)}
      </div>
      {tab === 'tasks' ? <Tasks /> : tab === 'timetable' ? <Timetable /> : <Exams />}
    </div>
  );
}

function SubjectOptions() {
  const t = useT();
  const lang = useSettings((s) => s.language);
  const top = useTopSubjects();
  return <><option value="">{t('none')}</option>{top.map((s) => <option key={s.id} value={s.id}>{subjectName(s, lang)}</option>)}</>;
}

function Tasks() {
  const t = useT();
  const user = useAuth((s) => s.user)!;
  const sName = useSubjectName();
  const [filter, setFilter] = useState<'pending' | 'completed' | 'overdue' | 'all'>('pending');
  const [f, setF] = useState({ title: '', description: '', subject: '', due: '', priority: 'medium' });
  const { data, loading, error, reload } = useLoad(async () =>
    unwrap<Task[]>(await supabase.from('tasks').select('*').order('completed').order('due_date', { ascending: true, nullsFirst: false })), []);
  const today = todayStr();
  const isOver = (x: Task) => !x.completed && !!x.due_date && x.due_date < today;
  const all = data ?? [];
  const list = all.filter((x) => filter === 'all' || (filter === 'pending' && !x.completed) || (filter === 'completed' && x.completed) || (filter === 'overdue' && isOver(x)));

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return toast.error(t('required'));
    const { error: err } = await supabase.from('tasks').insert({ user_id: user.id, title: f.title.trim(), description: f.description.trim() || null, subject_id: f.subject || null, due_date: f.due || null, priority: f.priority });
    if (err) return toast.error(err.message);
    setF({ title: '', description: '', subject: '', due: '', priority: 'medium' }); toast.success(t('saved')); reload();
  }
  async function toggle(x: Task) {
    await supabase.from('tasks').update({ completed: !x.completed, completed_at: x.completed ? null : new Date().toISOString() }).eq('id', x.id); reload();
  }
  async function remove(id: string) {
    if (!window.confirm(t('confirmDelete'))) return;
    await supabase.from('tasks').delete().eq('id', id); reload();
  }
  const counts = { pending: all.filter((x) => !x.completed).length, completed: all.filter((x) => x.completed).length, overdue: all.filter(isOver).length };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <form onSubmit={add} className="card space-y-3 lg:col-span-1" aria-label={t('addTask')}>
        <h2 className="text-lg font-bold">{t('addTask')}</h2>
        <Field label={t('title')}><input className="input" value={f.title} maxLength={200} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
        <Field label={t('description')} hint={t('optional')}><textarea className="input" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label={t('subject')}><select className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}><SubjectOptions /></select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('dueDate')}><input className="input" type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field>
          <Field label={t('priority')}><select className="input" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>{PRIORITIES.map((p) => <option key={p} value={p}>{t('pri_' + p)}</option>)}</select></Field>
        </div>
        <button className="btn btn-primary w-full">{t('add')}</button>
      </form>
      <section className="lg:col-span-2" aria-label={t('tab_tasks')}>
        <div className="mb-3 flex flex-wrap gap-2">
          {(['pending', 'completed', 'overdue', 'all'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={filter === k} className={`btn btn-sm ${filter === k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(k)}>
              {t(k === 'all' ? 'all' : 'st_' + k)}{k !== 'all' ? ` (${counts[k]})` : ''}
            </button>
          ))}
        </div>
        <Async loading={loading} error={error} onRetry={reload} empty={list.length === 0} emptyText={t('noTasks')}>
          <ul className="space-y-2">
            {list.map((x) => (
              <li key={x.id} className="card flex flex-wrap items-center justify-between gap-3 !p-3">
                <div className="min-w-0">
                  <p className={`font-semibold ${x.completed ? 'text-slate-500 line-through' : ''}`}>{x.title}</p>
                  {x.description && <p className="text-sm text-slate-700">{x.description}</p>}
                  <p className="mt-1 flex flex-wrap gap-1.5">
                    {x.subject_id && <Badge tone="blue">{sName(x.subject_id)}</Badge>}
                    <Badge tone={x.priority === 'high' ? 'red' : x.priority === 'medium' ? 'amber' : 'slate'}>{t('pri_' + x.priority)}</Badge>
                    {x.due_date && <Badge tone={isOver(x) ? 'red' : 'slate'}>{x.due_date}{isOver(x) ? ` · ${t('st_overdue')}` : ''}</Badge>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => void toggle(x)}>{x.completed ? <Undo2 className="h-4 w-4" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}{x.completed ? t('reopen') : t('markDone')}</button>
                  <button type="button" className="btn btn-secondary btn-sm text-red-800" onClick={() => void remove(x.id)} aria-label={t('delete')}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                </div>
              </li>
            ))}
          </ul>
        </Async>
      </section>
    </div>
  );
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

function Timetable() {
  const t = useT();
  const user = useAuth((s) => s.user)!;
  const lang = useSettings((s) => s.language);
  const sName = useSubjectName();
  const [f, setF] = useState({ weekday: '1', start: '08:00', end: '09:00', title: '', subject: '', kind: 'revision' });
  const { data, loading, error, reload } = useLoad(async () => unwrap<TimetableSlot[]>(await supabase.from('timetable_slots').select('*').order('start_time')), []);
  const dayName = (wd: number) => new Date(2024, 0, 7 + wd).toLocaleDateString(localeFor(lang), { weekday: 'long' }); // 7 Jan 2024 was a Sunday

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return toast.error(t('required'));
    if (f.end <= f.start) return toast.error(t('timeOrder'));
    const { error: err } = await supabase.from('timetable_slots').insert({ user_id: user.id, weekday: Number(f.weekday), start_time: f.start, end_time: f.end, title: f.title.trim(), subject_id: f.subject || null, kind: f.kind });
    if (err) return toast.error(err.message);
    setF({ ...f, title: '' }); toast.success(t('saved')); reload();
  }
  async function remove(id: string) { await supabase.from('timetable_slots').delete().eq('id', id); reload(); }

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-6" aria-label={t('addSlot')}>
        <Field label={t('weekday')}><select className="input" value={f.weekday} onChange={(e) => setF({ ...f, weekday: e.target.value })}>{DAY_ORDER.map((d) => <option key={d} value={d}>{dayName(d)}</option>)}</select></Field>
        <Field label={t('startTime')}><input className="input" type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
        <Field label={t('endTime')}><input className="input" type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
        <Field label={t('title')}><input className="input" value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label={t('subject')}><select className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}><SubjectOptions /></select></Field>
        <Field label={t('slotKind')}><select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{['class', 'revision', 'other'].map((k) => <option key={k} value={k}>{t('slot_' + k)}</option>)}</select></Field>
        <div className="sm:col-span-2 lg:col-span-6"><button className="btn btn-primary">{t('addSlot')}</button></div>
      </form>
      <Async loading={loading} error={error} onRetry={reload}>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {DAY_ORDER.map((d) => {
            const slots = (data ?? []).filter((s) => s.weekday === d);
            return (
              <section key={d} className="card !p-3" aria-label={dayName(d)}>
                <h3 className="mb-2 font-bold">{dayName(d)}</h3>
                {slots.length === 0 ? <p className="text-sm text-slate-600">—</p> : (
                  <ul className="space-y-2">
                    {slots.map((s) => (
                      <li key={s.id} className={`rounded-lg border p-2 text-sm ${s.kind === 'revision' ? 'border-accent-500 bg-accent-50' : 'border-slate-200 bg-slate-50'}`}>
                        <p className="font-semibold">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</p>
                        <p>{s.title}{s.subject_id ? ` · ${sName(s.subject_id)}` : ''}</p>
                        <p className="flex items-center justify-between"><Badge tone={s.kind === 'revision' ? 'green' : 'slate'}>{t('slot_' + s.kind)}</Badge>
                          <button type="button" className="p-2 text-red-800" onClick={() => void remove(s.id)} aria-label={t('delete')}><Trash2 className="h-4 w-4" aria-hidden="true" /></button></p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </Async>
    </div>
  );
}

function Exams() {
  const t = useT();
  const user = useAuth((s) => s.user)!;
  const sName = useSubjectName();
  const [f, setF] = useState({ title: '', subject: '', date: '' });
  const { data, loading, error, reload } = useLoad(async () => unwrap<Exam[]>(await supabase.from('exams').select('*').order('exam_date')), []);
  async function add(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim() || !f.date) return toast.error(t('required'));
    const { error: err } = await supabase.from('exams').insert({ user_id: user.id, title: f.title.trim(), subject_id: f.subject || null, exam_date: f.date });
    if (err) return toast.error(err.message);
    setF({ title: '', subject: '', date: '' }); toast.success(t('saved')); reload();
  }
  async function remove(id: string) { if (window.confirm(t('confirmDelete'))) { await supabase.from('exams').delete().eq('id', id); reload(); } }
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <form onSubmit={add} className="card space-y-3" aria-label={t('addExam')}>
        <h2 className="text-lg font-bold">{t('addExam')}</h2>
        <Field label={t('title')}><input className="input" value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label={t('subject')}><select className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}><SubjectOptions /></select></Field>
        <Field label={t('examDate')}><input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <button className="btn btn-primary w-full">{t('add')}</button>
      </form>
      <section className="lg:col-span-2">
        <Async loading={loading} error={error} onRetry={reload} empty={(data ?? []).length === 0} emptyText={t('noExams')}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {(data ?? []).map((x) => {
              const n = daysUntil(x.exam_date);
              return (
                <li key={x.id} className="card">
                  <p className="font-bold">{x.title}</p>
                  <p className="text-sm text-slate-700">{x.exam_date}{x.subject_id ? ` · ${sName(x.subject_id)}` : ''}</p>
                  <p role="status" className={`mt-2 text-2xl font-bold ${n < 0 ? 'text-slate-500' : n <= 7 ? 'text-red-700' : 'text-primary-800'}`}>{n < 0 ? t('passed') : n === 0 ? t('today') : t('daysLeft', { n })}</p>
                  <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={() => void remove(x.id)}><Trash2 className="h-4 w-4" aria-hidden="true" />{t('delete')}</button>
                </li>
              );
            })}
          </ul>
        </Async>
      </section>
    </div>
  );
}
