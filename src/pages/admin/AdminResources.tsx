import { FormEvent, useState } from 'react';
import { Eye, EyeOff, FileUp, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Field, Async } from '../../components/ui';
import { GRADES, MAX_PDF_BYTES, RESOURCE_TYPES, TERMS } from '../../lib/constants';
import { unwrap, useLoad } from '../../lib/hooks';
import { supabase, supabaseAnonKey, supabaseUrl } from '../../lib/supabase';
import type { Resource } from '../../lib/types';
import { useCatalog } from '../../stores/catalog';
import { LANG_OPTIONS, SubjectOptions, Table, VERIFY_OPTIONS, adminSubjectLabel } from './common';

type Form = Partial<Resource>;
const EMPTY: Form = { title: '', description: '', grade: 1, language: 'en', resource_type: 'textbook', source: '', verification: 'needs_verification', allow_download: false, allow_print: false, status: 'draft' };

async function uploadPdf(path: string, file: File, onProgress: (n: number) => void): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('You are not signed in.');
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/resources/${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', supabaseAnonKey);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = `Upload failed (${xhr.status}).`;
      try { const b = JSON.parse(xhr.responseText); msg = b.message || b.error || msg; } catch { /* keep */ }
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error('Network error while uploading. Check your connection.'));
    const fd = new FormData();
    fd.append('cacheControl', '3600');
    fd.append('', file);
    xhr.send(fd);
  });
}

async function checkPdf(file: File): Promise<string | null> {
  if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) return 'Only PDF files are allowed.';
  if (file.size > MAX_PDF_BYTES) return `The file is too large. The limit is ${Math.round(MAX_PDF_BYTES / 1048576)} MB.`;
  if (file.size === 0) return 'The file is empty.';
  const head = await file.slice(0, 5).text();
  if (head !== '%PDF-') return 'This file does not look like a real PDF.';
  return null;
}

export default function AdminResources() {
  const subjects = useCatalog((s) => s.subjects);
  const [form, setForm] = useState<Form | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useLoad(async () => unwrap<Resource[]>(await supabase.from('resources').select('*').order('created_at', { ascending: false })), []);
  const set = (k: keyof Resource, v: unknown) => setForm((f) => ({ ...(f ?? {}), [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.title || (form.title ?? '').trim().length < 3) return toast.error('Title needs at least 3 characters.');
    if (!form.subject_id) return toast.error('Choose a subject.');
    if (!form.source?.trim()) return toast.error('Source is required (write "Not stated" if unknown).');
    if (!form.id && !file) return toast.error('Choose a PDF file to upload.');
    if (file) { const bad = await checkPdf(file); if (bad) return toast.error(bad); }
    setBusy(true); setProgress(null);
    const meta = {
      title: (form.title ?? '').trim(), description: form.description?.trim() || null, subject_id: form.subject_id, grade: Number(form.grade), language: form.language,
      term: form.term ? Number(form.term) : null, lesson: form.lesson?.trim() || null, year: form.year ? Number(form.year) : null, resource_type: form.resource_type,
      source: (form.source ?? '').trim(), source_url: form.source_url?.trim() || null, syllabus_version: form.syllabus_version?.trim() || null, verification: form.verification,
      allow_download: Boolean(form.allow_download), allow_print: Boolean(form.allow_print), rights_note: form.rights_note?.trim() || null,
    };
    let newPath: string | null = null;
    try {
      if (file) { newPath = `${crypto.randomUUID()}.pdf`; await uploadPdf(newPath, file, setProgress); }
      if (form.id) {
        const patch = newPath ? { ...meta, file_path: newPath, file_size: file!.size } : meta;
        const { error: err } = await supabase.from('resources').update(patch).eq('id', form.id);
        if (err) throw new Error(err.message);
        if (newPath && form.file_path) await supabase.storage.from('resources').remove([form.file_path]);
      } else {
        const { error: err } = await supabase.from('resources').insert({ ...meta, file_path: newPath, file_size: file!.size, status: 'draft' });
        if (err) throw new Error(err.message);
      }
      toast.success('Saved.'); setForm(null); setFile(null); reload();
    } catch (ex) {
      if (newPath) await supabase.storage.from('resources').remove([newPath]); // do not leave orphan files
      toast.error(ex instanceof Error ? ex.message : 'Could not save.');
    } finally { setBusy(false); setProgress(null); }
  }

  async function setStatus(r: Resource, status: 'draft' | 'published') {
    const { error: err } = await supabase.from('resources').update({ status, published_at: status === 'published' ? new Date().toISOString() : null }).eq('id', r.id);
    if (err) return toast.error(err.message);
    toast.success(status === 'published' ? 'Published.' : 'Unpublished.'); reload();
  }
  async function remove(r: Resource) {
    if (!window.confirm(`Delete "${r.title}" and its file? This cannot be undone.`)) return;
    const { error: err } = await supabase.from('resources').delete().eq('id', r.id);
    if (err) return toast.error(err.message);
    await supabase.storage.from('resources').remove([r.file_path]);
    toast.success('Deleted.'); reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">PDF library</h2>
        <button type="button" className="btn btn-primary" onClick={() => { setForm({ ...EMPTY }); setFile(null); }}><FileUp className="h-5 w-5" aria-hidden="true" />Upload PDF</button></div>

      {form && (
        <form onSubmit={save} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="PDF details">
          <div className="sm:col-span-2 lg:col-span-3"><Field label={form.id ? 'Replace file (optional, PDF up to 50 MB)' : 'PDF file (required, up to 50 MB)'}>
            <input className="input" type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field></div>
          <div className="sm:col-span-2"><Field label="Title *"><input className="input" value={form.title ?? ''} maxLength={200} onChange={(e) => set('title', e.target.value)} /></Field></div>
          <Field label="Subject *"><select className="input" value={form.subject_id ?? ''} onChange={(e) => set('subject_id', e.target.value)}><SubjectOptions /></select></Field>
          <Field label="Grade *"><select className="input" value={form.grade ?? 1} onChange={(e) => set('grade', Number(e.target.value))}>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
          <Field label="Language *"><select className="input" value={form.language ?? 'en'} onChange={(e) => set('language', e.target.value)}>{LANG_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Type"><select className="input" value={form.resource_type ?? 'other'} onChange={(e) => set('resource_type', e.target.value)}>{RESOURCE_TYPES.map((x) => <option key={x} value={x}>{x.replace('_', ' ')}</option>)}</select></Field>
          <Field label="Term"><select className="input" value={form.term ?? ''} onChange={(e) => set('term', e.target.value)}><option value="">—</option>{TERMS.map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
          <Field label="Lesson"><input className="input" value={form.lesson ?? ''} onChange={(e) => set('lesson', e.target.value)} /></Field>
          <Field label="Year"><input className="input" inputMode="numeric" maxLength={4} value={form.year ?? ''} onChange={(e) => set('year', e.target.value.replace(/\D/g, ''))} /></Field>
          <Field label="Source *" hint="Who published it? e.g. the issuing body. Write “Not stated” if unknown."><input className="input" value={form.source ?? ''} onChange={(e) => set('source', e.target.value)} /></Field>
          <Field label="Source link"><input className="input" type="url" value={form.source_url ?? ''} onChange={(e) => set('source_url', e.target.value)} /></Field>
          <Field label="Syllabus version"><input className="input" value={form.syllabus_version ?? ''} onChange={(e) => set('syllabus_version', e.target.value)} /></Field>
          <Field label="Verification"><select className="input" value={form.verification ?? 'needs_verification'} onChange={(e) => set('verification', e.target.value)}>{VERIFY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <div className="sm:col-span-2 lg:col-span-3"><Field label="Description"><textarea className="input" rows={2} maxLength={2000} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field></div>
          <fieldset className="sm:col-span-2 lg:col-span-3"><legend className="label">Usage rights (only tick what the copyright holder allows)</legend>
            <label className="mr-6 inline-flex min-h-[44px] items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={Boolean(form.allow_download)} onChange={(e) => set('allow_download', e.target.checked)} />Students may download</label>
            <label className="inline-flex min-h-[44px] items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={Boolean(form.allow_print)} onChange={(e) => set('allow_print', e.target.checked)} />Students may print</label>
            <p className="text-sm text-slate-600">Note: the on-page reader must load the file to show it, so these switches control the buttons offered, not what a determined person could save.</p>
          </fieldset>
          <div className="sm:col-span-2 lg:col-span-3"><Field label="Rights note (shown to students)"><input className="input" value={form.rights_note ?? ''} onChange={(e) => set('rights_note', e.target.value)} /></Field></div>
          {progress !== null && <div className="sm:col-span-2 lg:col-span-3" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress"><div className="h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-primary-600" style={{ width: `${progress}%` }} /></div><p className="text-sm">{progress}% uploaded</p></div>}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button><button type="button" className="btn btn-secondary" onClick={() => { setForm(null); setFile(null); }}>Cancel</button></div>
        </form>
      )}

      <Async loading={loading} error={error} onRetry={reload} empty={(data ?? []).length === 0} emptyText="No PDFs yet. Upload the first one.">
        <Table head={['Title', 'Grade', 'Subject', 'Status', 'Check', 'Actions']}>
          {(data ?? []).map((r) => {
            const s = subjects.find((x) => x.id === r.subject_id);
            return (
              <tr key={r.id}>
                <td className="px-3 py-2 font-semibold">{r.title}</td><td className="px-3">{r.grade}</td><td className="px-3">{s ? adminSubjectLabel(s, subjects) : '—'}</td>
                <td className="px-3"><Badge tone={r.status === 'published' ? 'green' : 'slate'}>{r.status}</Badge></td>
                <td className="px-3"><Badge tone={r.verification === 'verified' ? 'green' : 'amber'}>{r.verification.replace('_', ' ')}</Badge></td>
                <td className="px-3"><span className="flex flex-wrap gap-1 py-1">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setForm(r); setFile(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</button>
                  {r.status === 'draft' ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => void setStatus(r, 'published')}><Eye className="h-4 w-4" aria-hidden="true" />Publish</button> : <button type="button" className="btn btn-secondary btn-sm" onClick={() => void setStatus(r, 'draft')}><EyeOff className="h-4 w-4" aria-hidden="true" />Unpublish</button>}
                  <button type="button" className="btn btn-secondary btn-sm text-red-800" onClick={() => void remove(r)}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button></span></td>
              </tr>
            );
          })}
        </Table>
      </Async>
    </div>
  );
}
