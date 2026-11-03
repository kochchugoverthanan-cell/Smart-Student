import { FormEvent, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Async, Badge, Field } from '../../components/ui';
import { GRADES, TERMS } from '../../lib/constants';
import { unwrap, useLoad } from '../../lib/hooks';
import { supabase } from '../../lib/supabase';
import type { PublicNote } from '../../lib/types';
import { LANG_OPTIONS, SubjectOptions, Table, VERIFY_OPTIONS } from './common';

type Form = Partial<PublicNote>;

export default function AdminNotes() {
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useLoad(async () => unwrap<PublicNote[]>(await supabase.from('notes_public').select('*').order('updated_at', { ascending: false })), []);
  const set = (k: keyof PublicNote, v: unknown) => setForm((f) => ({ ...(f ?? {}), [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form?.title?.trim() || !form.body?.trim()) return toast.error('Title and note text are required.');
    setBusy(true);
    const row = {
      title: (form.title ?? '').trim(), body: form.body, subject_id: form.subject_id || null, grade: form.grade ? Number(form.grade) : null, language: form.language ?? 'en',
      topic: form.topic?.trim() || null, term: form.term ? Number(form.term) : null, lesson: form.lesson?.trim() || null, verification: form.verification ?? 'needs_verification',
    };
    const res = form.id ? await supabase.from('notes_public').update(row).eq('id', form.id) : await supabase.from('notes_public').insert({ ...row, status: 'draft' });
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success('Saved.'); setForm(null); reload();
  }
  async function setStatus(n: PublicNote, status: 'draft' | 'published') {
    const { error: err } = await supabase.from('notes_public').update({ status, published_at: status === 'published' ? new Date().toISOString() : null }).eq('id', n.id);
    if (err) return toast.error(err.message); reload();
  }
  async function remove(n: PublicNote) {
    if (!window.confirm(`Delete "${n.title}"?`)) return;
    const { error: err } = await supabase.from('notes_public').delete().eq('id', n.id);
    if (err) return toast.error(err.message); reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Public notes</h2><button type="button" className="btn btn-primary" onClick={() => setForm({ language: 'en', verification: 'needs_verification', title: '', body: '' })}><Plus className="h-5 w-5" aria-hidden="true" />New note</button></div>
      {form && (
        <form onSubmit={save} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2"><Field label="Title *"><input className="input" value={form.title ?? ''} maxLength={200} onChange={(e) => set('title', e.target.value)} /></Field></div>
          <Field label="Subject"><select className="input" value={form.subject_id ?? ''} onChange={(e) => set('subject_id', e.target.value)}><SubjectOptions allowEmpty /></select></Field>
          <Field label="Grade"><select className="input" value={form.grade ?? ''} onChange={(e) => set('grade', e.target.value)}><option value="">—</option>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
          <Field label="Language"><select className="input" value={form.language ?? 'en'} onChange={(e) => set('language', e.target.value)}>{LANG_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Verification"><select className="input" value={form.verification ?? 'needs_verification'} onChange={(e) => set('verification', e.target.value)}>{VERIFY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Topic"><input className="input" value={form.topic ?? ''} onChange={(e) => set('topic', e.target.value)} /></Field>
          <Field label="Term"><select className="input" value={form.term ?? ''} onChange={(e) => set('term', e.target.value)}><option value="">—</option>{TERMS.map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
          <Field label="Lesson"><input className="input" value={form.lesson ?? ''} onChange={(e) => set('lesson', e.target.value)} /></Field>
          <div className="sm:col-span-2 lg:col-span-3"><Field label="Note text * (plain text; write only content you have the right to publish)"><textarea className="input" rows={8} maxLength={20000} value={form.body ?? ''} onChange={(e) => set('body', e.target.value)} /></Field></div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button className="btn btn-primary" disabled={busy}>Save</button><button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button></div>
        </form>
      )}
      <Async loading={loading} error={error} onRetry={reload} empty={(data ?? []).length === 0} emptyText="No public notes yet.">
        <Table head={['Title', 'Grade', 'Language', 'Status', 'Actions']}>
          {(data ?? []).map((n) => (
            <tr key={n.id}>
              <td className="px-3 py-2 font-semibold">{n.title}</td><td className="px-3">{n.grade ?? '—'}</td><td className="px-3">{n.language}</td>
              <td className="px-3"><Badge tone={n.status === 'published' ? 'green' : 'slate'}>{n.status}</Badge></td>
              <td className="px-3"><span className="flex flex-wrap gap-1 py-1">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm(n)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</button>
                {n.status === 'draft' ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => void setStatus(n, 'published')}><Eye className="h-4 w-4" aria-hidden="true" />Publish</button> : <button type="button" className="btn btn-secondary btn-sm" onClick={() => void setStatus(n, 'draft')}><EyeOff className="h-4 w-4" aria-hidden="true" />Unpublish</button>}
                <button type="button" className="btn btn-secondary btn-sm text-red-800" onClick={() => void remove(n)}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button></span></td>
            </tr>
          ))}
        </Table>
      </Async>
    </div>
  );
}
