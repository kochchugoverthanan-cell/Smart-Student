import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bookmark, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { Async, Badge, Field, PageHeader, VerificationBadge } from '../components/ui';
import { SignInPrompt } from '../components/guards';
import { GRADES, LANGUAGES, RESOURCE_TYPES, TERMS, cleanQuery } from '../lib/constants';
import { unwrap, useDebounced, useLoad } from '../lib/hooks';
import { useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import type { Resource } from '../lib/types';
import { useAuth } from '../stores/auth';
import { useCatalog, useSubjectName, useTopSubjects } from '../stores/catalog';
import { useSettings } from '../stores/settings';
import { subjectName } from '../stores/catalog';

const PAGE = 24;
type View = 'all' | 'recent' | 'favourites' | 'bookmarks';

export default function Library() {
  const t = useT();
  const lang = useSettings((s) => s.language);
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const [sp, setSp] = useSearchParams();
  const top = useTopSubjects();
  const all = useCatalog((s) => s.subjects);
  const sName = useSubjectName();
  const [limit, setLimit] = useState(PAGE);
  const [qText, setQText] = useState(sp.get('q') ?? '');
  const q = useDebounced(qText);
  const view = (sp.get('view') as View) || 'all';
  const f = { grade: sp.get('grade') ?? '', subject: sp.get('subject') ?? '', sub: sp.get('sub') ?? '', language: sp.get('language') ?? '', term: sp.get('term') ?? '', year: sp.get('year') ?? '', type: sp.get('type') ?? '', lesson: sp.get('lesson') ?? '' };
  const lessonQ = useDebounced(f.lesson);
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k === 'subject') n.delete('sub'); setSp(n, { replace: true }); setLimit(PAGE); };
  const children = all.filter((s) => s.parent_id === f.subject && s.is_active);

  const { data, loading, error, reload } = useLoad(async (): Promise<Resource[]> => {
    if (view !== 'all') {
      if (!user) return [];
      let qb = supabase.from('user_library').select('last_opened_at,resources(*)').eq('user_id', user.id);
      if (view === 'recent') qb = qb.not('last_opened_at', 'is', null).order('last_opened_at', { ascending: false });
      if (view === 'favourites') qb = qb.eq('is_favourite', true);
      if (view === 'bookmarks') qb = qb.eq('is_bookmarked', true);
      const rows = unwrap<{ resources: Resource | null }[]>(await qb.limit(60));
      return rows.map((r) => r.resources).filter((r): r is Resource => Boolean(r) && r!.status === 'published');
    }
    let qb = supabase.from('resources').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(limit);
    if (f.grade) qb = qb.eq('grade', Number(f.grade));
    if (f.sub) qb = qb.eq('subject_id', f.sub);
    else if (f.subject) qb = qb.in('subject_id', [f.subject, ...all.filter((s) => s.parent_id === f.subject).map((s) => s.id)]);
    if (f.language) qb = qb.eq('language', f.language);
    if (f.term) qb = qb.eq('term', Number(f.term));
    if (f.year) qb = qb.eq('year', Number(f.year));
    if (f.type) qb = qb.eq('resource_type', f.type);
    const l = cleanQuery(lessonQ); if (l) qb = qb.ilike('lesson', `%${l}%`);
    const s = cleanQuery(q); if (s) qb = qb.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
    return unwrap<Resource[]>(await qb);
  }, [view, user?.id, limit, f.grade, f.subject, f.sub, f.language, f.term, f.year, f.type, lessonQ, q, all.length]);

  const views: { key: View; label: string }[] = [
    { key: 'all', label: t('all') }, { key: 'recent', label: t('recent') }, { key: 'favourites', label: t('favourite') }, { key: 'bookmarks', label: t('bookmark') },
  ];

  async function clearHistory() {
    if (!user || !window.confirm(t('confirmDelete'))) return;
    await supabase.from('user_library').delete().eq('user_id', user.id).eq('is_favourite', false).eq('is_bookmarked', false);
    await supabase.from('user_library').update({ last_opened_at: null, last_page: 1 }).eq('user_id', user.id);
    toast.success(t('deleted')); reload();
  }

  return (
    <div>
      <PageHeader title={t('library')} />
      <div role="tablist" aria-label={t('library')} className="mb-4 flex flex-wrap gap-2">
        {views.map((v) => (
          <button key={v.key} role="tab" aria-selected={view === v.key} className="tab" type="button" onClick={() => { setParam('view', v.key === 'all' ? '' : v.key); setLimit(PAGE); }}>{v.label}</button>
        ))}
      </div>

      {view === 'all' ? (
        <form className="card mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => e.preventDefault()} role="search">
          <div className="sm:col-span-2"><Field label={t('search')}><input className="input" type="search" value={qText} onChange={(e) => setQText(e.target.value)} /></Field></div>
          <Field label={t('grade')}><select className="input" value={f.grade} onChange={(e) => setParam('grade', e.target.value)}><option value="">{t('all')}</option>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
          <Field label={t('subject')}><select className="input" value={f.subject} onChange={(e) => setParam('subject', e.target.value)}><option value="">{t('all')}</option>{top.map((s) => <option key={s.id} value={s.id}>{subjectName(s, lang)}</option>)}</select></Field>
          {children.length > 0 && <Field label={t('aesCategory')}><select className="input" value={f.sub} onChange={(e) => setParam('sub', e.target.value)}><option value="">{t('all')}</option>{children.map((s) => <option key={s.id} value={s.id}>{subjectName(s, lang)}</option>)}</select></Field>}
          <Field label={t('language')}><select className="input" value={f.language} onChange={(e) => setParam('language', e.target.value)}><option value="">{t('all')}</option>{LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select></Field>
          <Field label={t('term')}><select className="input" value={f.term} onChange={(e) => setParam('term', e.target.value)}><option value="">{t('all')}</option>{TERMS.map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
          <Field label={t('year')}><input className="input" inputMode="numeric" maxLength={4} value={f.year} onChange={(e) => setParam('year', e.target.value.replace(/\D/g, ''))} /></Field>
          <Field label={t('lesson')}><input className="input" value={f.lesson} onChange={(e) => setParam('lesson', e.target.value)} /></Field>
          <Field label={t('resourceType')}><select className="input" value={f.type} onChange={(e) => setParam('type', e.target.value)}><option value="">{t('all')}</option>{RESOURCE_TYPES.map((x) => <option key={x} value={x}>{t('type_' + x)}</option>)}</select></Field>
        </form>
      ) : !user ? (
        <SignInPrompt />
      ) : view === 'recent' ? (
        <div className="mb-4"><button type="button" className="btn btn-secondary btn-sm" onClick={() => void clearHistory()}>{t('clearHistory')}</button></div>
      ) : null}

      {(view === 'all' || user) && (
        <Async loading={loading} error={error} onRetry={reload} empty={(data ?? []).length === 0} emptyText={view === 'all' ? t('libraryEmpty') : t('none')}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((r) => (
              <li key={r.id} className="card flex flex-col">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <Badge tone="blue">{t('grade')} {r.grade}</Badge>
                  <Badge>{sName(r.subject_id)}</Badge>
                  <Badge>{LANGUAGES.find((l) => l.code === r.language)?.label}</Badge>
                  <VerificationBadge v={r.verification} />
                </div>
                <h2 className="text-lg font-bold">{r.title}</h2>
                {r.description && <p className="mt-1 line-clamp-3 text-slate-700">{r.description}</p>}
                <p className="mt-2 text-sm text-slate-600">{t('type_' + r.resource_type)} · {r.source}{r.year ? ` · ${r.year}` : ''}{r.syllabus_version ? ` · ${r.syllabus_version}` : ''}</p>
                <p className="text-sm text-slate-600">{t('uploaded')}: {r.created_at.slice(0, 10)}</p>
                <Link to={`/library/${r.id}`} className="btn btn-primary mt-3 self-start">{t('openResource')}</Link>
              </li>
            ))}
          </ul>
          {view === 'all' && (data ?? []).length >= limit && <div className="mt-5 text-center"><button type="button" className="btn btn-secondary" onClick={() => setLimit((n) => n + PAGE)}>{t('viewMore')}</button></div>}
        </Async>
      )}
    </div>
  );
}
