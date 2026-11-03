import { FormEvent, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Async, Badge, Field } from '../../components/ui';
import { GRADES, MEDIUMS, TERMS } from '../../lib/constants';
import { unwrap, useLoad } from '../../lib/hooks';
import { supabase } from '../../lib/supabase';
import type { GlossaryTerm, Subject, SubjectGrade } from '../../lib/types';
import { useCatalog } from '../../stores/catalog';
import { LANG_OPTIONS, SubjectOptions, Table, VERIFY_OPTIONS, adminSubjectLabel } from './common';

export function AdminGlossary() {
  const [form, setForm] = useState<Partial<GlossaryTerm> | null>(null);
  const { data, loading, error, reload } = useLoad(async () => unwrap<GlossaryTerm[]>(await supabase.from('glossary_terms').select('*').order('term').limit(500)), []);
  const set = (k: keyof GlossaryTerm, v: unknown) => setForm((f) => ({ ...(f ?? {}), [k]: v }));
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form?.term?.trim() || !form.definition?.trim()) return toast.error('Term and definition are required.');
    const row = {
      term: (form.term ?? '').trim(), definition: (form.definition ?? '').trim(), subject_id: form.subject_id || null, grade: form.grade ? Number(form.grade) : null, language: form.language ?? 'en',
      translation: form.translation?.trim() || null, translation_language: form.translation?.trim() ? form.translation_language ?? 'ta' : null, verification: form.verification ?? 'needs_verification',
    };
    const res = form.id ? await supabase.from('glossary_terms').update(row).eq('id', form.id) : await supabase.from('glossary_terms').insert({ ...row, status: 'draft' });
    if (res.error) return toast.error(res.error.message);
    toast.success('Saved.'); setForm(null); reload();
  }
  async function setStatus(g: GlossaryTerm, status: 'draft' | 'published') { const { error: err } = await supabase.from('glossary_terms').update({ status }).eq('id', g.id); if (err) return toast.error(err.message); reload(); }
  async function remove(g: GlossaryTerm) { if (window.confirm(`Delete "${g.term}"?`)) { await supabase.from('glossary_terms').delete().eq('id', g.id); reload(); } }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Glossary</h2><button type="button" className="btn btn-primary" onClick={() => setForm({ language: 'en', verification: 'needs_verification', term: '', definition: '' })}><Plus className="h-5 w-5" aria-hidden="true" />New term</button></div>
      <p className="text-sm text-slate-700">Only add translations that a qualified person has checked. Mark them “Verified” only after that check.</p>
      {form && (
        <form onSubmit={save} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Term *"><input className="input" value={form.term ?? ''} onChange={(e) => set('term', e.target.value)} /></Field>
          <Field label="Language of term"><select className="input" value={form.language ?? 'en'} onChange={(e) => set('language', e.target.value)}>{LANG_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Subject"><select className="input" value={form.subject_id ?? ''} onChange={(e) => set('subject_id', e.target.value)}><SubjectOptions allowEmpty /></select></Field>
          <div className="sm:col-span-2 lg:col-span-3"><Field label="Definition *"><textarea className="input" rows={2} value={form.definition ?? ''} onChange={(e) => set('definition', e.target.value)} /></Field></div>
          <Field label="Translation (optional)"><input className="input" value={form.translation ?? ''} onChange={(e) => set('translation', e.target.value)} /></Field>
          <Field label="Translation language"><select className="input" value={form.translation_language ?? 'ta'} onChange={(e) => set('translation_language', e.target.value)}>{LANG_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Grade"><select className="input" value={form.grade ?? ''} onChange={(e) => set('grade', e.target.value)}><option value="">—</option>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
          <Field label="Verification"><select className="input" value={form.verification ?? 'needs_verification'} onChange={(e) => set('verification', e.target.value)}>{VERIFY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button className="btn btn-primary">Save</button><button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button></div>
        </form>
      )}
      <Async loading={loading} error={error} onRetry={reload} empty={(data ?? []).length === 0} emptyText="No glossary terms yet.">
        <Table head={['Term', 'Language', 'Status', 'Actions']}>
          {(data ?? []).map((g) => (
            <tr key={g.id}><td className="px-3 py-2 font-semibold">{g.term}</td><td className="px-3">{g.language}</td><td className="px-3"><Badge tone={g.status === 'published' ? 'green' : 'slate'}>{g.status}</Badge></td>
              <td className="px-3"><span className="flex flex-wrap gap-1 py-1">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm(g)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</button>
                {g.status === 'draft' ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => void setStatus(g, 'published')}><Eye className="h-4 w-4" aria-hidden="true" />Publish</button> : <button type="button" className="btn btn-secondary btn-sm" onClick={() => void setStatus(g, 'draft')}><EyeOff className="h-4 w-4" aria-hidden="true" />Unpublish</button>}
                <button type="button" className="btn btn-secondary btn-sm text-red-800" onClick={() => void remove(g)}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button></span></td></tr>
          ))}
        </Table>
      </Async>
    </div>
  );
}

export function AdminSubjects() {
  const subjects = useCatalog((s) => s.subjects);
  const load = useCatalog((s) => s.load);
  const [edit, setEdit] = useState<Subject | null>(null);
  const [sel, setSel] = useState<Subject | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    if (!edit.name_en.trim() || !edit.name_ta.trim() || !edit.name_si.trim()) return toast.error('Give the name in all three languages (copy the English name if you do not have a translation yet).');
    const { error: err } = await supabase.from('subjects').update({ name_en: edit.name_en.trim(), name_ta: edit.name_ta.trim(), name_si: edit.name_si.trim(), is_active: edit.is_active, sort_order: Number(edit.sort_order) || 0, official_link: edit.official_link?.trim() || null }).eq('id', edit.id);
    if (err) return toast.error(err.message);
    toast.success('Saved.'); setEdit(null); await load();
  }
  const e = edit;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Subjects</h2>
      <p className="text-sm text-slate-700">Rename the “Other subject” slot here when you decide its name. Hidden subjects disappear for students. Use “Grades” to say which grades, mediums and pathways a subject applies to; until a subject has at least one mapping it is offered for every grade.</p>
      {e && (
        <form onSubmit={save} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name (English)"><input className="input" value={e.name_en} onChange={(x) => setEdit({ ...e, name_en: x.target.value })} /></Field>
          <Field label="Name (Tamil)"><input className="input" lang="ta" value={e.name_ta} onChange={(x) => setEdit({ ...e, name_ta: x.target.value })} /></Field>
          <Field label="Name (Sinhala)"><input className="input" lang="si" value={e.name_si} onChange={(x) => setEdit({ ...e, name_si: x.target.value })} /></Field>
          <Field label="Sort order"><input className="input" type="number" value={e.sort_order} onChange={(x) => setEdit({ ...e, sort_order: Number(x.target.value) })} /></Field>
          <div className="sm:col-span-2"><Field label="Official curriculum link (optional)"><input className="input" type="url" value={e.official_link ?? ''} onChange={(x) => setEdit({ ...e, official_link: x.target.value })} /></Field></div>
          <label className="inline-flex min-h-[44px] items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={e.is_active} onChange={(x) => setEdit({ ...e, is_active: x.target.checked })} />Visible to students</label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button className="btn btn-primary">Save</button><button type="button" className="btn btn-secondary" onClick={() => setEdit(null)}>Cancel</button></div>
        </form>
      )}
      <Table head={['Subject', 'Tamil', 'Sinhala', 'Visible', 'Actions']}>
        {subjects.map((s) => (
          <tr key={s.id}><td className="px-3 py-2 font-semibold">{adminSubjectLabel(s, subjects)}{s.is_editable_slot ? ' ★' : ''}</td><td className="px-3" lang="ta">{s.name_ta}</td><td className="px-3" lang="si">{s.name_si}</td><td className="px-3">{s.is_active ? 'Yes' : 'No'}</td>
            <td className="px-3"><span className="flex gap-1 py-1"><button type="button" className="btn btn-secondary btn-sm" onClick={() => setEdit(s)}>Edit</button><button type="button" className="btn btn-secondary btn-sm" onClick={() => setSel(s)}>Grades</button></span></td></tr>
        ))}
      </Table>
      {sel && <GradeMap subject={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

function GradeMap({ subject, onClose }: { subject: Subject; onClose: () => void }) {
  const load = useCatalog((s) => s.load);
  const [f, setF] = useState({ grade: '1', medium: '', pathway: '', year: '', version: '', term: '', school: '', note: '' });
  const { data, loading, error, reload } = useLoad(async () => unwrap<SubjectGrade[]>(await supabase.from('subject_grades').select('*').eq('subject_id', subject.id).order('grade')), [subject.id]);
  async function add(e: FormEvent) {
    e.preventDefault();
    const { error: err } = await supabase.from('subject_grades').insert({ subject_id: subject.id, grade: Number(f.grade), medium: f.medium || null, pathway: f.pathway || null, syllabus_year: f.year ? Number(f.year) : null, syllabus_version: f.version.trim() || null, term: f.term ? Number(f.term) : null, school: f.school.trim() || null, note: f.note.trim() || null });
    if (err) return toast.error(err.message);
    toast.success('Added.'); reload(); void load();
  }
  async function del(id: string) { await supabase.from('subject_grades').delete().eq('id', id); reload(); void load(); }
  return (
    <section className="card space-y-3 border-primary-300" aria-label={`Grades for ${subject.name_en}`}>
      <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Grades for {subject.name_en}</h3><button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Close</button></div>
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Grade"><select className="input" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })}>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
        <Field label="Medium"><select className="input" value={f.medium} onChange={(e) => setF({ ...f, medium: e.target.value })}><option value="">All mediums</option>{MEDIUMS.map((m) => <option key={m.code} value={m.code}>{m.code}</option>)}</select></Field>
        <Field label="Pathway"><select className="input" value={f.pathway} onChange={(e) => setF({ ...f, pathway: e.target.value })}><option value="">—</option><option value="primary">Primary</option><option value="junior_secondary">Junior secondary</option><option value="ol">O/L</option><option value="al">A/L</option></select></Field>
        <Field label="Term"><select className="input" value={f.term} onChange={(e) => setF({ ...f, term: e.target.value })}><option value="">All terms</option>{TERMS.map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
        <Field label="Syllabus year"><input className="input" inputMode="numeric" maxLength={4} value={f.year} onChange={(e) => setF({ ...f, year: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label="Syllabus version"><input className="input" value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} /></Field>
        <Field label="School (optional)"><input className="input" value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} /></Field>
        <Field label="Note"><input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        <div className="sm:col-span-2 lg:col-span-4"><button className="btn btn-primary">Add mapping</button></div>
      </form>
      <Async loading={loading} error={error} onRetry={reload} empty={(data ?? []).length === 0} emptyText="No mappings yet. This subject is currently offered for every grade.">
        <ul className="divide-y divide-slate-100">{(data ?? []).map((m) => <li key={m.id} className="flex items-center justify-between py-2"><span>Grade {m.grade}{m.medium ? ` · ${m.medium}` : ''}{m.pathway ? ` · ${m.pathway}` : ''}{m.term ? ` · term ${m.term}` : ''}{m.syllabus_year ? ` · ${m.syllabus_year}` : ''}{m.syllabus_version ? ` · ${m.syllabus_version}` : ''}</span><button type="button" className="btn btn-secondary btn-sm text-red-800" onClick={() => void del(m.id)}>Remove</button></li>)}</ul>
      </Async>
    </section>
  );
}
