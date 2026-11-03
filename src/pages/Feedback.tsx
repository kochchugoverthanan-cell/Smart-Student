import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { SignInPrompt } from '../components/guards';
import { Field, PageHeader } from '../components/ui';
import { GRADES } from '../lib/constants';
import { useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { useAuth } from '../stores/auth';
import { subjectName, useTopSubjects } from '../stores/catalog';
import { useSettings } from '../stores/settings';

const KINDS = ['resource_request', 'broken', 'incorrect', 'outdated', 'other'];

export default function Feedback() {
  const t = useT();
  const user = useAuth((s) => s.user);
  const lang = useSettings((s) => s.language);
  const top = useTopSubjects();
  const [f, setF] = useState({ kind: 'resource_request', grade: '', subject: '', message: '' });
  const [busy, setBusy] = useState(false);
  if (!user) return <div><PageHeader title={t('feedback')} /><SignInPrompt /></div>;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (f.message.trim().length < 5) return toast.error(t('messageShort'));
    setBusy(true);
    const { error } = await supabase.from('content_reports').insert({
      kind: f.kind, message: f.message.trim(), grade: f.grade ? Number(f.grade) : null, subject_id: f.subject || null, reporter_id: user!.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message.includes('too many') ? t('tooManyReports') : error.message);
    toast.success(t('reportSent')); setF({ ...f, message: '' });
  }
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t('feedback')} subtitle={t('feedbackHelp')} />
      <form onSubmit={submit} className="card space-y-4">
        <Field label={t('reportKind')}><select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{KINDS.map((k) => <option key={k} value={k}>{t('kind_' + k)}</option>)}</select></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('grade')} hint={t('optional')}><select className="input" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })}><option value="">{t('none')}</option>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
          <Field label={t('subject')} hint={t('optional')}><select className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}><option value="">{t('none')}</option>{top.map((s) => <option key={s.id} value={s.id}>{subjectName(s, lang)}</option>)}</select></Field>
        </div>
        <Field label={t('message')}><textarea className="input" rows={5} maxLength={2000} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Field>
        <p className="text-sm text-slate-700">{t('feedbackPrivacy')}</p>
        <button className="btn btn-primary" disabled={busy}>{t('send')}</button>
      </form>
    </div>
  );
}
