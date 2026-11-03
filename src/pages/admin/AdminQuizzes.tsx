import { FormEvent, useState } from 'react';
import { Eye, EyeOff, ListPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Async, Badge, Field } from '../../components/ui';
import { DIFFICULTIES, GRADES } from '../../lib/constants';
import { unwrap, useLoad } from '../../lib/hooks';
import { supabase } from '../../lib/supabase';
import type { Quiz, QuizQuestion } from '../../lib/types';
import { LANG_OPTIONS, SubjectOptions, Table, VERIFY_OPTIONS } from './common';

type QForm = { id?: string; qtype: 'mcq' | 'true_false' | 'short'; prompt: string; options: string[]; correct: string; accepted: string; explanation: string; topic: string };
const EMPTY_Q: QForm = { qtype: 'mcq', prompt: '', options: ['', '', '', ''], correct: '0', accepted: '', explanation: '', topic: '' };

export default function AdminQuizzes() {
  const [form, setForm] = useState<Partial<Quiz> | null>(null);
  const [open, setOpen] = useState<Quiz | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useLoad(async () => unwrap<(Quiz & { quiz_questions: { id: string }[] })[]>(await supabase.from('quizzes').select('*, quiz_questions(id)').order('created_at', { ascending: false })), []);
  const set = (k: keyof Quiz, v: unknown) => setForm((f) => ({ ...(f ?? {}), [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form?.title?.trim()) return toast.error('Title is required.');
    setBusy(true);
    const row = {
      title: (form.title ?? '').trim(), description: form.description?.trim() || null, subject_id: form.subject_id || null, grade: form.grade ? Number(form.grade) : null,
      language: form.language ?? 'en', topic: form.topic?.trim() || null, difficulty: form.difficulty ?? 'medium', source: form.source?.trim() || null,
      origin: form.origin ?? 'manual', verification: form.verification ?? 'needs_verification',
    };
    const res = form.id ? await supabase.from('quizzes').update(row).eq('id', form.id) : await supabase.from('quizzes').insert({ ...row, status: 'draft' });
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success('Saved.'); setForm(null); reload();
  }
  async function setStatus(q: Quiz & { quiz_questions: { id: string }[] }, status: 'draft' | 'published') {
    if (status === 'published' && q.quiz_questions.length === 0) return toast.error('Add at least one question before publishing.');
    const { error: err } = await supabase.from('quizzes').update({ status }).eq('id', q.id);
    if (err) return toast.error(err.message); reload();
  }
  async function remove(q: Quiz) {
    if (!window.confirm(`Delete quiz "${q.title}" and all its questions?`)) return;
    const { error: err } = await supabase.from('quizzes').delete().eq('id', q.id);
    if (err) return toast.error(err.message); if (open?.id === q.id) setOpen(null); reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Quizzes</h2><button type="button" className="btn btn-primary" onClick={() => setForm({ language: 'en', difficulty: 'medium', origin: 'manual', verification: 'needs_verification', title: '' })}><Plus className="h-5 w-5" aria-hidden="true" />New quiz</button></div>
      <p className="text-sm text-slate-700">AI-generated questions are not created automatically in this release. If you paste in questions from an AI tool, set “Origin” to AI-generated, keep it as a draft, check every answer, and only then publish.</p>
      {form && (
        <form onSubmit={save} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2"><Field label="Title *"><input className="input" value={form.title ?? ''} maxLength={200} onChange={(e) => set('title', e.target.value)} /></Field></div>
          <Field label="Subject"><select className="input" value={form.subject_id ?? ''} onChange={(e) => set('subject_id', e.target.value)}><SubjectOptions allowEmpty /></select></Field>
          <Field label="Grade"><select className="input" value={form.grade ?? ''} onChange={(e) => set('grade', e.target.value)}><option value="">—</option>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
          <Field label="Language"><select className="input" value={form.language ?? 'en'} onChange={(e) => set('language', e.target.value)}>{LANG_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Difficulty"><select className="input" value={form.difficulty ?? 'medium'} onChange={(e) => set('difficulty', e.target.value)}>{DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}</select></Field>
          <Field label="Topic"><input className="input" value={form.topic ?? ''} onChange={(e) => set('topic', e.target.value)} /></Field>
          <Field label="Source (material the questions are based on)"><input className="input" value={form.source ?? ''} onChange={(e) => set('source', e.target.value)} /></Field>
          <Field label="Origin"><select className="input" value={form.origin ?? 'manual'} onChange={(e) => set('origin', e.target.value)}><option value="manual">Written by a person</option><option value="ai_generated">AI-generated (needs review)</option></select></Field>
          <Field label="Verification"><select className="input" value={form.verification ?? 'needs_verification'} onChange={(e) => set('verification', e.target.value)}>{VERIFY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <div className="sm:col-span-2 lg:col-span-3"><Field label="Description"><input className="input" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field></div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button className="btn btn-primary" disabled={busy}>Save</button><button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button></div>
        </form>
      )}
      <Async loading={loading} error={error} onRetry={reload} empty={(data ?? []).length === 0} emptyText="No quizzes yet.">
        <Table head={['Title', 'Questions', 'Status', 'Origin', 'Actions']}>
          {(data ?? []).map((q) => (
            <tr key={q.id}>
              <td className="px-3 py-2 font-semibold">{q.title}</td><td className="px-3">{q.quiz_questions.length}</td>
              <td className="px-3"><Badge tone={q.status === 'published' ? 'green' : 'slate'}>{q.status}</Badge></td>
              <td className="px-3">{q.origin === 'ai_generated' ? <Badge tone="amber">AI-generated</Badge> : 'Person'}</td>
              <td className="px-3"><span className="flex flex-wrap gap-1 py-1">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(q)}><ListPlus className="h-4 w-4" aria-hidden="true" />Questions</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm(q)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</button>
                {q.status === 'draft' ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => void setStatus(q, 'published')}><Eye className="h-4 w-4" aria-hidden="true" />Publish</button> : <button type="button" className="btn btn-secondary btn-sm" onClick={() => void setStatus(q, 'draft')}><EyeOff className="h-4 w-4" aria-hidden="true" />Unpublish</button>}
                <button type="button" className="btn btn-secondary btn-sm text-red-800" onClick={() => void remove(q)}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button></span></td>
            </tr>
          ))}
        </Table>
      </Async>
      {open && <Questions quiz={open} onClose={() => { setOpen(null); reload(); }} />}
    </div>
  );
}

function Questions({ quiz, onClose }: { quiz: Quiz; onClose: () => void }) {
  const [f, setF] = useState<QForm>(EMPTY_Q);
  const { data, loading, error, reload } = useLoad(async () => unwrap<QuizQuestion[]>(await supabase.from('quiz_questions').select('*').eq('quiz_id', quiz.id).order('position')), [quiz.id]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!f.prompt.trim()) return toast.error('Write the question.');
    let options: string[] | null = null; let correct = f.correct; let accepted: string[] = [];
    if (f.qtype === 'mcq') {
      const opts = f.options.map((o, i) => ({ o: o.trim(), i })).filter((x) => x.o);
      const idx = opts.findIndex((x) => x.i === Number(f.correct));
      if (opts.length < 2) return toast.error('Give at least two answer choices.');
      if (idx < 0) return toast.error('The correct choice cannot be empty.');
      options = opts.map((x) => x.o); correct = String(idx);
    } else if (f.qtype === 'short') {
      correct = f.correct.trim();
      if (!correct) return toast.error('Write the correct answer.');
      accepted = f.accepted.split(',').map((s) => s.trim()).filter(Boolean);
    } else correct = f.correct === 'false' ? 'false' : 'true';
    const row = { quiz_id: quiz.id, qtype: f.qtype, prompt: f.prompt.trim(), options, correct_answer: correct, accepted_answers: accepted, explanation: f.explanation.trim() || null, topic: f.topic.trim() || null };
    const res = f.id ? await supabase.from('quiz_questions').update(row).eq('id', f.id) : await supabase.from('quiz_questions').insert({ ...row, position: (data?.length ?? 0) + 1 });
    if (res.error) return toast.error(res.error.message);
    toast.success('Saved.'); setF(EMPTY_Q); reload();
  }
  function edit(q: QuizQuestion) {
    setF({ id: q.id, qtype: q.qtype, prompt: q.prompt, options: [...(q.options ?? []), '', '', '', ''].slice(0, Math.max(4, q.options?.length ?? 0)), correct: q.correct_answer, accepted: (q.accepted_answers ?? []).join(', '), explanation: q.explanation ?? '', topic: q.topic ?? '' });
  }
  async function remove(id: string) { if (window.confirm('Delete this question?')) { await supabase.from('quiz_questions').delete().eq('id', id); reload(); } }

  return (
    <section className="card space-y-4 border-primary-300" aria-label={`Questions for ${quiz.title}`}>
      <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Questions: {quiz.title}</h3><button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Close</button></div>
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <Field label="Type"><select className="input" value={f.qtype} onChange={(e) => setF({ ...EMPTY_Q, id: f.id, prompt: f.prompt, qtype: e.target.value as QForm['qtype'], correct: e.target.value === 'true_false' ? 'true' : e.target.value === 'short' ? '' : '0' })}><option value="mcq">Multiple choice</option><option value="true_false">True or false</option><option value="short">Short answer</option></select></Field>
        <Field label="Topic"><input className="input" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Question *"><textarea className="input" rows={2} value={f.prompt} onChange={(e) => setF({ ...f, prompt: e.target.value })} /></Field></div>
        {f.qtype === 'mcq' && (
          <fieldset className="sm:col-span-2"><legend className="label">Choices (tick the correct one)</legend>
            {f.options.map((o, i) => (
              <div key={i} className="mb-2 flex items-center gap-2"><input type="radio" name="correct" className="h-5 w-5" checked={f.correct === String(i)} onChange={() => setF({ ...f, correct: String(i) })} aria-label={`Choice ${i + 1} is correct`} />
                <input className="input !mt-0" value={o} placeholder={`Choice ${i + 1}`} onChange={(e) => setF({ ...f, options: f.options.map((x, k) => (k === i ? e.target.value : x)) })} /></div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setF({ ...f, options: [...f.options, ''] })}>Add choice</button>
          </fieldset>
        )}
        {f.qtype === 'true_false' && <Field label="Correct answer"><select className="input" value={f.correct} onChange={(e) => setF({ ...f, correct: e.target.value })}><option value="true">True</option><option value="false">False</option></select></Field>}
        {f.qtype === 'short' && (<>
          <Field label="Correct answer *"><input className="input" value={f.correct} onChange={(e) => setF({ ...f, correct: e.target.value })} /></Field>
          <Field label="Other accepted answers (comma separated)"><input className="input" value={f.accepted} onChange={(e) => setF({ ...f, accepted: e.target.value })} /></Field>
        </>)}
        <div className="sm:col-span-2"><Field label="Explanation (shown after answering)"><textarea className="input" rows={2} value={f.explanation} onChange={(e) => setF({ ...f, explanation: e.target.value })} /></Field></div>
        <div className="flex gap-2 sm:col-span-2"><button className="btn btn-primary">{f.id ? 'Update question' : 'Add question'}</button>{f.id && <button type="button" className="btn btn-secondary" onClick={() => setF(EMPTY_Q)}>Cancel edit</button>}</div>
      </form>
      <Async loading={loading} error={error} onRetry={reload} empty={(data ?? []).length === 0} emptyText="No questions yet.">
        <ol className="space-y-2">
          {(data ?? []).map((q) => (
            <li key={q.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-200 p-3">
              <span><span className="font-semibold">{q.position}. {q.prompt}</span><span className="block text-sm text-slate-600">{q.qtype} · answer: {q.qtype === 'mcq' ? q.options?.[Number(q.correct_answer)] : q.correct_answer}</span></span>
              <span className="flex gap-1"><button type="button" className="btn btn-secondary btn-sm" onClick={() => edit(q)}>Edit</button><button type="button" className="btn btn-secondary btn-sm text-red-800" onClick={() => void remove(q.id)}>Delete</button></span>
            </li>
          ))}
        </ol>
      </Async>
    </section>
  );
}
