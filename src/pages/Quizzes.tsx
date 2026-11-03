import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Async, Badge, Field, PageHeader, VerificationBadge } from '../components/ui';
import { DIFFICULTIES, GRADES, LANGUAGES, QTYPES, cleanQuery } from '../lib/constants';
import { unwrap, useDebounced, useLoad } from '../lib/hooks';
import { useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import type { AttemptAnswer, Quiz, QuizQuestion } from '../lib/types';
import { useAuth } from '../stores/auth';
import { subjectName, useSubjectName, useTopSubjects } from '../stores/catalog';
import { useSettings } from '../stores/settings';

type QuizRow = Quiz & { quiz_questions: { qtype: string }[] };

export function QuizList() {
  const t = useT();
  const lang = useSettings((s) => s.language);
  const top = useTopSubjects();
  const sName = useSubjectName();
  const [f, setF] = useState({ grade: '', subject: '', topic: '', language: '', qtype: '', difficulty: '' });
  const d = useDebounced(f);
  const { data, loading, error, reload } = useLoad(async () => {
    let qb = supabase.from('quizzes').select('*, quiz_questions(qtype)').eq('status', 'published').order('created_at', { ascending: false }).limit(60);
    if (d.grade) qb = qb.eq('grade', Number(d.grade));
    if (d.subject) qb = qb.eq('subject_id', d.subject);
    if (d.language) qb = qb.eq('language', d.language);
    if (d.difficulty) qb = qb.eq('difficulty', d.difficulty);
    const tp = cleanQuery(d.topic); if (tp) qb = qb.ilike('topic', `%${tp}%`);
    const rows = unwrap<QuizRow[]>(await qb);
    return d.qtype ? rows.filter((r) => r.quiz_questions.some((x) => x.qtype === d.qtype)) : rows;
  }, [d.grade, d.subject, d.topic, d.language, d.qtype, d.difficulty]);

  return (
    <div>
      <PageHeader title={t('quizzes')} />
      <form className="card mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="search" onSubmit={(e) => e.preventDefault()}>
        <Field label={t('grade')}><select className="input" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })}><option value="">{t('all')}</option>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
        <Field label={t('subject')}><select className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}><option value="">{t('all')}</option>{top.map((s) => <option key={s.id} value={s.id}>{subjectName(s, lang)}</option>)}</select></Field>
        <Field label={t('topic')}><input className="input" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} /></Field>
        <Field label={t('language')}><select className="input" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}><option value="">{t('all')}</option>{LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select></Field>
        <Field label={t('questionType')}><select className="input" value={f.qtype} onChange={(e) => setF({ ...f, qtype: e.target.value })}><option value="">{t('all')}</option>{QTYPES.map((x) => <option key={x} value={x}>{t('qtype_' + x)}</option>)}</select></Field>
        <Field label={t('difficulty')}><select className="input" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}><option value="">{t('all')}</option>{DIFFICULTIES.map((x) => <option key={x} value={x}>{t('diff_' + x)}</option>)}</select></Field>
      </form>
      <Async loading={loading} error={error} onRetry={reload} empty={(data ?? []).length === 0} emptyText={t('quizEmpty')}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((q) => (
            <li key={q.id} className="card flex flex-col">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {q.grade && <Badge tone="blue">{t('grade')} {q.grade}</Badge>}{q.subject_id && <Badge>{sName(q.subject_id)}</Badge>}
                <Badge>{t('diff_' + q.difficulty)}</Badge><VerificationBadge v={q.verification} />
                {q.origin === 'ai_generated' && <Badge tone="amber">{t('aiGenerated')}</Badge>}
              </div>
              <h2 className="text-lg font-bold">{q.title}</h2>
              {q.description && <p className="mt-1 text-slate-700">{q.description}</p>}
              <p className="mt-2 text-sm text-slate-600">{q.quiz_questions.length} {t('questions')}{q.topic ? ` · ${q.topic}` : ''}{q.source ? ` · ${t('source')}: ${q.source}` : ''}</p>
              <Link className="btn btn-primary mt-3 self-start" to={`/quizzes/${q.id}`}>{t('startQuiz')}</Link>
            </li>
          ))}
        </ul>
      </Async>
    </div>
  );
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
function isCorrect(q: QuizQuestion, a: string | undefined): boolean {
  if (!a) return false;
  if (q.qtype === 'short') return [q.correct_answer, ...(q.accepted_answers ?? [])].some((x) => norm(x) === norm(a));
  return a === q.correct_answer;
}
/** Raw value of an answer: option text for multiple choice, 'true'/'false', or typed text. */
function rawAnswer(q: QuizQuestion, a: string | undefined): string {
  if (!a) return '';
  if (q.qtype === 'mcq') return q.options?.[Number(a)] ?? '';
  return a;
}
export function showAnswer(t: (k: string) => string, qtype: string, v: string): string {
  if (!v) return '—';
  if (qtype === 'true_false') return v === 'true' ? t('trueLabel') : t('falseLabel');
  return v;
}

export function QuizPlay() {
  const t = useT();
  const { id = '' } = useParams();
  const user = useAuth((s) => s.user);
  const track = useAuth((s) => s.profile?.track_activity ?? true);
  const sName = useSubjectName();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; review: AttemptAnswer[] } | null>(null);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const { data, loading, error, reload } = useLoad(async () => {
    const quiz = unwrap<Quiz | null>(await supabase.from('quizzes').select('*').eq('id', id).maybeSingle());
    if (!quiz) throw new Error(t('notFound'));
    const qs = unwrap<QuizQuestion[]>(await supabase.from('quiz_questions').select('*').eq('quiz_id', id).order('position'));
    return { quiz, qs };
  }, [id]);

  async function finish() {
    if (!data) return;
    const review: AttemptAnswer[] = data.qs.map((q) => ({
      question_id: q.id, prompt: q.prompt, qtype: q.qtype, given: rawAnswer(q, answers[q.id]),
      expected: q.qtype === 'mcq' ? (q.options?.[Number(q.correct_answer)] ?? '') : q.correct_answer,
      correct: isCorrect(q, answers[q.id]), explanation: q.explanation,
    }));
    const score = review.filter((r) => r.correct).length;
    setResult({ score, review });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (user && track) {
      const { error: err } = await supabase.from('quiz_attempts').insert({
        user_id: user.id, quiz_id: data.quiz.id, quiz_title: data.quiz.title, subject_id: data.quiz.subject_id, grade: data.quiz.grade,
        score, total: review.length, answers: review,
      });
      setSaveMsg(err ? err.message : t('resultSaved'));
    } else setSaveMsg(user ? null : t('signInToSave'));
  }

  const reset = () => { setAnswers({}); setResult(null); setSaveMsg(null); setOnlyWrong(false); window.scrollTo({ top: 0 }); };

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-3"><Link className="underline" to="/quizzes">← {t('quizzes')}</Link></p>
      <Async loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <PageHeader title={data.quiz.title} subtitle={data.quiz.description ?? undefined} />
            <div className="mb-4 flex flex-wrap gap-1.5">
              {data.quiz.grade && <Badge tone="blue">{t('grade')} {data.quiz.grade}</Badge>}{data.quiz.subject_id && <Badge>{sName(data.quiz.subject_id)}</Badge>}
              <VerificationBadge v={data.quiz.verification} />{data.quiz.origin === 'ai_generated' && <Badge tone="amber">{t('aiGenerated')}</Badge>}
              {data.quiz.source && <Badge>{t('source')}: {data.quiz.source}</Badge>}
            </div>
            {data.quiz.verification !== 'verified' && <p role="note" className="mb-4 rounded-lg bg-amber-50 p-3 text-amber-900">{t('notOfficial')}</p>}

            {result && (
              <div role="status" className="card mb-5 border-primary-300 bg-primary-50">
                <p className="text-xl font-bold">{t('yourScore')}: {result.score} / {result.review.length}</p>
                {saveMsg && <p className="text-sm text-slate-700">{saveMsg}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button type="button" className="btn btn-primary" onClick={reset}>{t('tryAgain')}</button>
                  <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} />{t('showWrongOnly')}</label>
                </div>
              </div>
            )}

            <ol className="space-y-4">
              {data.qs.map((q, i) => {
                const rv = result?.review[i];
                if (result && onlyWrong && rv?.correct) return null;
                return (
                  <li key={q.id} className={`card ${rv ? (rv.correct ? 'border-green-400' : 'border-red-400') : ''}`}>
                    <fieldset disabled={Boolean(result)}>
                      <legend className="mb-2 font-semibold"><span className="mr-2 text-slate-600">{i + 1}.</span>{q.prompt}</legend>
                      {q.qtype === 'mcq' && (q.options ?? []).map((o, k) => (
                        <label key={k} className="mb-1 flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3">
                          <input type="radio" name={q.id} checked={answers[q.id] === String(k)} onChange={() => setAnswers({ ...answers, [q.id]: String(k) })} />{o}
                        </label>
                      ))}
                      {q.qtype === 'true_false' && ['true', 'false'].map((v) => (
                        <label key={v} className="mb-1 flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3">
                          <input type="radio" name={q.id} checked={answers[q.id] === v} onChange={() => setAnswers({ ...answers, [q.id]: v })} />{v === 'true' ? t('trueLabel') : t('falseLabel')}
                        </label>
                      ))}
                      {q.qtype === 'short' && <input className="input" value={answers[q.id] ?? ''} placeholder={t('typeAnswer')} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />}
                    </fieldset>
                    {rv && (
                      <div className="mt-3 space-y-1 text-sm" role="note">
                        <p className={`flex items-center gap-2 font-semibold ${rv.correct ? 'text-green-800' : 'text-red-800'}`}>
                          {rv.correct ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <XCircle className="h-5 w-5" aria-hidden="true" />}{rv.correct ? t('correct') : t('incorrect')}
                        </p>
                        {!rv.correct && <p>{t('yourAnswer')}: {showAnswer(t, q.qtype, rv.given)}</p>}
                        <p>{t('correctAnswer')}: {showAnswer(t, q.qtype, rv.expected)}</p>
                        {rv.explanation && <p className="text-slate-700">{t('explanation')}: {rv.explanation}</p>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {!result && <button type="button" className="btn btn-primary mt-5" onClick={() => void finish()}>{t('finishQuiz')}</button>}
          </>
        )}
      </Async>
    </div>
  );
}
