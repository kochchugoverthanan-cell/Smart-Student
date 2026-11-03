import { useState } from 'react';
import { Async, Badge, Field, PageHeader, VerificationBadge } from '../components/ui';
import { GRADES, LANGUAGES, cleanQuery } from '../lib/constants';
import { unwrap, useDebounced, useLoad } from '../lib/hooks';
import { useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import type { GlossaryTerm } from '../lib/types';
import { subjectName, useSubjectName, useTopSubjects } from '../stores/catalog';
import { useSettings } from '../stores/settings';

export default function Glossary() {
  const t = useT();
  const lang = useSettings((s) => s.language);
  const top = useTopSubjects();
  const sName = useSubjectName();
  const [f, setF] = useState({ q: '', subject: '', grade: '', language: '' });
  const d = useDebounced(f);
  const { data, loading, error, reload } = useLoad(async () => {
    let qb = supabase.from('glossary_terms').select('*').eq('status', 'published').order('term').limit(200);
    if (d.subject) qb = qb.eq('subject_id', d.subject);
    if (d.grade) qb = qb.eq('grade', Number(d.grade));
    if (d.language) qb = qb.eq('language', d.language);
    const s = cleanQuery(d.q); if (s) qb = qb.or(`term.ilike.%${s}%,definition.ilike.%${s}%,translation.ilike.%${s}%`);
    return unwrap<GlossaryTerm[]>(await qb);
  }, [d.q, d.subject, d.grade, d.language]);
  return (
    <div>
      <PageHeader title={t('glossary')} subtitle={t('glossaryHelp')} />
      <form className="card mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="search" onSubmit={(e) => e.preventDefault()}>
        <Field label={t('search')}><input className="input" type="search" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></Field>
        <Field label={t('subject')}><select className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}><option value="">{t('all')}</option>{top.map((s) => <option key={s.id} value={s.id}>{subjectName(s, lang)}</option>)}</select></Field>
        <Field label={t('grade')}><select className="input" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })}><option value="">{t('all')}</option>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
        <Field label={t('language')}><select className="input" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}><option value="">{t('all')}</option>{LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select></Field>
      </form>
      <Async loading={loading} error={error} onRetry={reload} empty={(data ?? []).length === 0} emptyText={t('glossaryEmpty')}>
        <dl className="space-y-3">
          {(data ?? []).map((g) => (
            <div key={g.id} className="card">
              <dt lang={g.language} className="text-lg font-bold">{g.term}</dt>
              <dd lang={g.language} className="mt-1">{g.definition}</dd>
              {g.translation && <dd lang={g.translation_language ?? undefined} className="mt-1 text-slate-800">{g.translation_language ? `${LANGUAGES.find((l) => l.code === g.translation_language)?.label}: ` : ''}{g.translation}</dd>}
              <dd className="mt-2 flex flex-wrap gap-1.5">{g.subject_id && <Badge tone="blue">{sName(g.subject_id)}</Badge>}{g.grade && <Badge>{t('grade')} {g.grade}</Badge>}<VerificationBadge v={g.verification} /></dd>
            </div>
          ))}
        </dl>
      </Async>
    </div>
  );
}
