import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, Download, ExternalLink, Flag, Heart, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import PdfReader from '../components/PdfReader';
import { Async, Badge, Field, VerificationBadge } from '../components/ui';
import { LANGUAGES } from '../lib/constants';
import { unwrap, useLoad } from '../lib/hooks';
import { useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import type { Resource, UserLibrary } from '../lib/types';
import { useAuth } from '../stores/auth';
import { useSubjectName } from '../stores/catalog';

const KINDS = ['broken', 'incorrect', 'outdated', 'other'];

export default function ResourceView() {
  const t = useT();
  const { id = '' } = useParams();
  const user = useAuth((s) => s.user);
  const track = useAuth((s) => s.profile?.track_activity ?? true);
  const sName = useSubjectName();
  const [lib, setLib] = useState<UserLibrary | null>(null);
  const [showReport, setShowReport] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const { data, loading, error, reload } = useLoad(async () => {
    const res = unwrap<Resource | null>(await supabase.from('resources').select('*').eq('id', id).maybeSingle());
    if (!res) throw new Error(t('notFound'));
    const signed = await supabase.storage.from('resources').createSignedUrl(res.file_path, 3600);
    if (signed.error) throw new Error(signed.error.message);
    let row: UserLibrary | null = null;
    if (user) {
      row = unwrap<UserLibrary | null>(await supabase.from('user_library').select('*').eq('user_id', user.id).eq('resource_id', id).maybeSingle());
      if (track) await supabase.from('user_library').upsert({ user_id: user.id, resource_id: id, last_opened_at: new Date().toISOString() }, { onConflict: 'user_id,resource_id' });
    }
    return { res, url: signed.data.signedUrl, row };
  }, [id, user?.id]);

  useEffect(() => { if (data) setLib(data.row); }, [data]);
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  async function toggle(field: 'is_favourite' | 'is_bookmarked') {
    if (!user) return toast.error(t('signInNeeded'));
    const next = !(lib?.[field] ?? false);
    const { error: err } = await supabase.from('user_library').upsert({ user_id: user.id, resource_id: id, [field]: next }, { onConflict: 'user_id,resource_id' });
    if (err) return toast.error(err.message);
    setLib({ user_id: user.id, resource_id: id, is_favourite: false, is_bookmarked: false, last_page: 1, last_opened_at: null, ...(lib ?? {}), [field]: next } as UserLibrary);
  }

  function onPage(page: number) {
    if (!user || !track) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void supabase.from('user_library').upsert({ user_id: user.id, resource_id: id, last_page: page }, { onConflict: 'user_id,resource_id' });
    }, 1200);
  }

  async function signedLink(download: boolean) {
    if (!data) return null;
    const { data: s, error: err } = await supabase.storage.from('resources').createSignedUrl(data.res.file_path, 300, download ? { download: `${data.res.title.replace(/[^\w\- ]+/g, '').slice(0, 80) || 'resource'}.pdf` } : undefined);
    if (err || !s) { toast.error(err?.message ?? t('errorGeneric')); return null; }
    return s.signedUrl;
  }
  async function doDownload() { const u = await signedLink(true); if (u) { const a = document.createElement('a'); a.href = u; a.click(); } }
  async function doPrint() { const u = await signedLink(false); if (u) { window.open(u, '_blank', 'noopener'); toast(t('printHint')); } }

  const r = data?.res;
  return (
    <div>
      <p className="mb-3"><Link className="underline" to="/library">← {t('library')}</Link></p>
      <Async loading={loading} error={error} onRetry={reload}>
        {r && data && (
          <div className="space-y-5">
            <header>
              <div className="mb-2 flex flex-wrap gap-1.5">
                <Badge tone="blue">{t('grade')} {r.grade}</Badge><Badge>{sName(r.subject_id)}</Badge>
                <Badge>{LANGUAGES.find((l) => l.code === r.language)?.label}</Badge><VerificationBadge v={r.verification} />
              </div>
              <h1 className="text-2xl font-bold text-primary-900">{r.title}</h1>
              {r.description && <p className="mt-1 max-w-prose text-slate-800">{r.description}</p>}
              <p className="mt-2 text-sm text-slate-700">
                {t('type_' + r.resource_type)} · {t('source')}: {r.source}{r.year ? ` · ${r.year}` : ''}{r.term ? ` · ${t('term')} ${r.term}` : ''}{r.lesson ? ` · ${r.lesson}` : ''}{r.syllabus_version ? ` · ${r.syllabus_version}` : ''}
              </p>
              {r.source_url && <a className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary-800 underline" href={r.source_url} target="_blank" rel="noopener noreferrer">{t('source')} <ExternalLink className="h-4 w-4" aria-hidden="true" /></a>}
              {r.rights_note && <p className="mt-1 text-sm text-slate-700">{r.rights_note}</p>}
              {r.verification !== 'verified' && <p role="note" className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900">{t('notOfficial')}</p>}
            </header>

            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={lib?.is_favourite ?? false} className="btn btn-secondary" onClick={() => void toggle('is_favourite')}><Heart className={`h-5 w-5 ${lib?.is_favourite ? 'fill-red-600 text-red-600' : ''}`} aria-hidden="true" />{t('favourite')}</button>
              <button type="button" aria-pressed={lib?.is_bookmarked ?? false} className="btn btn-secondary" onClick={() => void toggle('is_bookmarked')}><Bookmark className={`h-5 w-5 ${lib?.is_bookmarked ? 'fill-primary-600 text-primary-600' : ''}`} aria-hidden="true" />{t('bookmark')}</button>
              {r.allow_download ? <button type="button" className="btn btn-secondary" onClick={() => void doDownload()}><Download className="h-5 w-5" aria-hidden="true" />{t('download')}</button> : <span className="self-center text-sm text-slate-700">{t('downloadNotAllowed')}</span>}
              {r.allow_print ? <button type="button" className="btn btn-secondary" onClick={() => void doPrint()}><Printer className="h-5 w-5" aria-hidden="true" />{t('print')}</button> : <span className="self-center text-sm text-slate-700">{t('printNotAllowed')}</span>}
              <button type="button" className="btn btn-secondary" aria-expanded={showReport} onClick={() => setShowReport((v) => !v)}><Flag className="h-5 w-5" aria-hidden="true" />{t('report')}</button>
            </div>

            {showReport && <ReportForm resourceId={r.id} onDone={() => setShowReport(false)} />}
            {lib && lib.last_page > 1 && track && <p className="text-sm text-slate-700">{t('continueFrom', { n: lib.last_page })}</p>}
            <PdfReader url={data.url} title={r.title} initialPage={lib?.last_page ?? data.row?.last_page ?? 1} onPageChange={onPage} />
          </div>
        )}
      </Async>
    </div>
  );
}

function ReportForm({ resourceId, onDone }: { resourceId: string; onDone: () => void }) {
  const t = useT();
  const user = useAuth((s) => s.user);
  const [kind, setKind] = useState('broken');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user) return <p className="card">{t('signInNeeded')} <Link className="underline" to="/signin">{t('signIn')}</Link></p>;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (message.trim().length < 5) return toast.error(t('messageShort'));
    setBusy(true);
    const { error } = await supabase.from('content_reports').insert({ resource_id: resourceId, kind, message: message.trim(), reporter_id: user!.id });
    setBusy(false);
    if (error) return toast.error(error.message.includes('too many') ? t('tooManyReports') : error.message);
    toast.success(t('reportSent')); onDone();
  }
  return (
    <form onSubmit={submit} className="card space-y-3">
      <Field label={t('reportKind')}><select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map((k) => <option key={k} value={k}>{t('kind_' + k)}</option>)}</select></Field>
      <Field label={t('message')}><textarea className="input" rows={3} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
      <button className="btn btn-primary" disabled={busy}>{t('send')}</button>
    </form>
  );
}
