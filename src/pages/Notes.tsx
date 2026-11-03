import { FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bookmark, Download, Lock, Globe, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ReadAloud from '../components/ReadAloud';
import { SignInPrompt } from '../components/guards';
import { Async, Badge, Field, PageHeader, VerificationBadge } from '../components/ui';
import { GRADES, LANGUAGES, TERMS, cleanQuery, download } from '../lib/constants';
import { unwrap, useDebounced, useLoad } from '../lib/hooks';
import { useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import type { PrivateNote, PublicNote } from '../lib/types';
import { useAuth } from '../stores/auth';
import { subjectName, useSubjectName, useTopSubjects } from '../stores/catalog';
import { useSettings } from '../stores/settings';

export default function Notes() {
  const t = useT();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') === 'mine' ? 'mine' : 'public';
  return (
    <div>
      <PageHeader title={t('notes')} />
      <div role="tablist" className="mb-4 flex flex-wrap gap-2">
        <button type="button" role="tab" aria-selected={tab === 'public'} className="tab" onClick={() => setSp({})}><Globe className="mr-2 inline h-4 w-4" aria-hidden="true" />{t('publicNotes')}</button>
        <button type="button" role="tab" aria-selected={tab === 'mine'} className="tab" onClick={() => setSp({ tab: 'mine' })}><Lock className="mr-2 inline h-4 w-4" aria-hidden="true" />{t('myNotes')}</button>
      </div>
      {tab === 'public' ? <PublicNotes /> : <MyNotes />}
    </div>
  );
}

function PublicNotes() {
  const t = useT();
  const lang = useSettings((s) => s.language);
  const user = useAuth((s) => s.user);
  const top = useTopSubjects();
  const sName = useSubjectName();
  const [f, setF] = useState({ q: '', grade: '', subject: '', language: '', topic: '', term: '', lesson: '', savedOnly: false });
  const d = useDebounced(f);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const { data, loading, error, reload } = useLoad(async () => {
    let ids: string[] | null = null;
    if (user) {
      const rows = unwrap<{ note_id: string }[]>(await supabase.from('saved_notes').select('note_id').eq('user_id', user.id));
      ids = rows.map((r) => r.note_id); setSaved(new Set(ids));
    }
    let qb = supabase.from('notes_public').select('*').eq('status', 'published').order('updated_at', { ascending: false }).limit(60);
    if (d.grade) qb = qb.eq('grade', Number(d.grade));
    if (d.subject) qb = qb.eq('subject_id', d.subject);
    if (d.language) qb = qb.eq('language', d.language);
    if (d.term) qb = qb.eq('term', Number(d.term));
    const tp = cleanQuery(d.topic); if (tp) qb = qb.ilike('topic', `%${tp}%`);
    const ls = cleanQuery(d.lesson); if (ls) qb = qb.ilike('lesson', `%${ls}%`);
    const s = cleanQuery(d.q); if (s) qb = qb.or(`title.ilike.%${s}%,body.ilike.%${s}%`);
    if (d.savedOnly) { if (!ids || ids.length === 0) return [] as PublicNote[]; qb = qb.in('id', ids); }
    return unwrap<PublicNote[]>(await qb);
  }, [d.q, d.grade, d.subject, d.language, d.topic, d.term, d.lesson, d.savedOnly, user?.id]);

  async function toggleSave(id: string) {
    if (!user) return toast.error(t('signInNeeded'));
    if (saved.has(id)) await supabase.from('saved_notes').delete().eq('user_id', user.id).eq('note_id', id);
    else await supabase.from('saved_notes').insert({ user_id: user.id, note_id: id });
    const n = new Set(saved); if (n.has(id)) n.delete(id); else n.add(id); setSaved(n);
  }

  return (
    <div>
      <form className="card mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="sm:col-span-2"><Field label={t('search')}><input className="input" type="search" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></Field></div>
        <Field label={t('grade')}><select className="input" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })}><option value="">{t('all')}</option>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
        <Field label={t('subject')}><select className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}><option value="">{t('all')}</option>{top.map((s) => <option key={s.id} value={s.id}>{subjectName(s, lang)}</option>)}</select></Field>
        <Field label={t('language')}><select className="input" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}><option value="">{t('all')}</option>{LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select></Field>
        <Field label={t('topic')}><input className="input" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} /></Field>
        <Field label={t('term')}><select className="input" value={f.term} onChange={(e) => setF({ ...f, term: e.target.value })}><option value="">{t('all')}</option>{TERMS.map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
        <Field label={t('lesson')}><input className="input" value={f.lesson} onChange={(e) => setF({ ...f, lesson: e.target.value })} /></Field>
        {user && <label className="flex min-h-[44px] items-center gap-2 self-end"><input type="checkbox" className="h-5 w-5" checked={f.savedOnly} onChange={(e) => setF({ ...f, savedOnly: e.target.checked })} />{t('savedOnly')}</label>}
      </form>
      <Async loading={loading} error={error} onRetry={reload} empty={(data ?? []).length === 0}>
        <ul className="space-y-3">
          {(data ?? []).map((n) => (
            <li key={n.id} className="card">
              <details>
                <summary className="cursor-pointer list-none">
                  <span className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone="blue"><Globe className="h-3 w-3" aria-hidden="true" />{t('public')}</Badge>
                    {n.grade && <Badge>{t('grade')} {n.grade}</Badge>}{n.subject_id && <Badge>{sName(n.subject_id)}</Badge>}
                    <Badge>{LANGUAGES.find((l) => l.code === n.language)?.label}</Badge><VerificationBadge v={n.verification} />
                  </span>
                  <span className="text-lg font-bold">{n.title}</span>
                  {n.topic && <span className="block text-sm text-slate-700">{n.topic}{n.lesson ? ` · ${n.lesson}` : ''}</span>}
                </summary>
                <div className="mt-3 space-y-3">
                  <p lang={n.language} className="whitespace-pre-wrap">{n.body}</p>
                  <ReadAloud text={`${n.title}. ${n.body}`} lang={n.language} />
                  <button type="button" aria-pressed={saved.has(n.id)} className="btn btn-secondary btn-sm" onClick={() => void toggleSave(n.id)}>
                    <Bookmark className={`h-4 w-4 ${saved.has(n.id) ? 'fill-primary-600 text-primary-600' : ''}`} aria-hidden="true" />{t('bookmark')}
                  </button>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Async>
    </div>
  );
}

function MyNotes() {
  const t = useT();
  const user = useAuth((s) => s.user);
  const sName = useSubjectName();
  const lang = useSettings((s) => s.language);
  const top = useTopSubjects();
  const [q, setQ] = useState('');
  const [onlyMarked, setOnlyMarked] = useState(false);
  const [edit, setEdit] = useState<Partial<PrivateNote> | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useLoad(async () => {
    if (!user) return [] as PrivateNote[];
    return unwrap<PrivateNote[]>(await supabase.from('notes_private').select('*').order('updated_at', { ascending: false }));
  }, [user?.id]);
  if (!user) return <SignInPrompt />;

  const list = (data ?? []).filter((n) => (!onlyMarked || n.bookmarked) && (!q.trim() || `${n.title} ${n.body}`.toLowerCase().includes(q.trim().toLowerCase())));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit || !edit.title?.trim()) return toast.error(t('required'));
    setBusy(true);
    const payload = { title: edit.title.trim(), body: edit.body ?? '', subject_id: edit.subject_id || null };
    const res = edit.id
      ? await supabase.from('notes_private').update(payload).eq('id', edit.id)
      : await supabase.from('notes_private').insert({ ...payload, user_id: user!.id });
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(t('saved')); setEdit(null); reload();
  }
  async function remove(id: string) {
    if (!window.confirm(t('confirmDelete'))) return;
    const { error: err } = await supabase.from('notes_private').delete().eq('id', id);
    if (err) return toast.error(err.message);
    toast.success(t('deleted')); reload();
  }
  async function mark(n: PrivateNote) {
    await supabase.from('notes_private').update({ bookmarked: !n.bookmarked }).eq('id', n.id); reload();
  }
  function exportAll() {
    const text = (data ?? []).map((n) => `# ${n.title}\n(${n.updated_at.slice(0, 10)}${n.subject_id ? ` · ${sName(n.subject_id)}` : ''})\n\n${n.body}\n`).join('\n----------------------------------------\n\n');
    download('my-notes.txt', text);
  }

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 rounded-lg bg-slate-100 p-3"><Lock className="h-5 w-5" aria-hidden="true" />{t('onlyYou')}</p>
      <div className="flex flex-wrap items-end gap-3">
        <button type="button" className="btn btn-primary" onClick={() => setEdit({ title: '', body: '' })}>{t('newNote')}</button>
        <div className="min-w-[12rem] flex-1"><Field label={t('search')}><input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} /></Field></div>
        <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={onlyMarked} onChange={(e) => setOnlyMarked(e.target.checked)} />{t('bookmark')}</label>
        <button type="button" className="btn btn-secondary" disabled={(data ?? []).length === 0} onClick={exportAll}><Download className="h-5 w-5" aria-hidden="true" />{t('exportNotes')}</button>
      </div>

      {edit && (
        <form onSubmit={save} className="card space-y-3" aria-label={t('newNote')}>
          <Field label={t('title')}><input className="input" value={edit.title ?? ''} maxLength={200} onChange={(e) => setEdit({ ...edit, title: e.target.value })} required /></Field>
          <Field label={t('subject')} hint={t('optional')}>
            <select className="input" value={edit.subject_id ?? ''} onChange={(e) => setEdit({ ...edit, subject_id: e.target.value || null })}>
              <option value="">{t('none')}</option>{top.map((s) => <option key={s.id} value={s.id}>{subjectName(s, lang)}</option>)}
            </select>
          </Field>
          <Field label={t('noteBody')}><textarea className="input" rows={8} maxLength={20000} value={edit.body ?? ''} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
          <div className="flex gap-2"><button className="btn btn-primary" disabled={busy}>{t('save')}</button><button type="button" className="btn btn-secondary" onClick={() => setEdit(null)}>{t('cancel')}</button></div>
        </form>
      )}

      <Async loading={loading} error={error} onRetry={reload} empty={list.length === 0} emptyText={(data ?? []).length === 0 ? t('noNotesYet') : t('noResults')}>
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((n) => (
            <li key={n.id} className="card">
              <div className="mb-1 flex flex-wrap items-center gap-1.5"><Badge tone="amber"><Lock className="h-3 w-3" aria-hidden="true" />{t('private')}</Badge>{n.subject_id && <Badge>{sName(n.subject_id)}</Badge>}</div>
              <h2 className="font-bold">{n.title}</h2>
              <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-slate-800">{n.body}</p>
              <details className="mt-2"><summary className="cursor-pointer text-sm font-semibold text-primary-800">{t('readAloud')}</summary><div className="mt-2"><ReadAloud text={`${n.title}. ${n.body}`} lang={lang} showLanguage /></div></details>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEdit(n)}><Pencil className="h-4 w-4" aria-hidden="true" />{t('edit')}</button>
                <button type="button" aria-pressed={n.bookmarked} className="btn btn-secondary btn-sm" onClick={() => void mark(n)}><Bookmark className={`h-4 w-4 ${n.bookmarked ? 'fill-primary-600 text-primary-600' : ''}`} aria-hidden="true" />{t('bookmark')}</button>
                <button type="button" className="btn btn-secondary btn-sm text-red-800" onClick={() => void remove(n.id)}><Trash2 className="h-4 w-4" aria-hidden="true" />{t('delete')}</button>
              </div>
            </li>
          ))}
        </ul>
      </Async>
    </div>
  );
}
