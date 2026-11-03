import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { useT } from '../lib/i18n';
import { useSettings } from '../stores/settings';
import { Spinner } from './ui';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface Props { url: string; title: string; initialPage?: number; onPageChange?: (page: number, total: number) => void }

/** On-page PDF reader: page navigation and zoom. Pages are drawn on a canvas (no copy/paste text layer). */
export default function PdfReader({ url, title, initialPage = 1, onPageChange }: Props) {
  const t = useT();
  const lowData = useSettings((s) => s.lowData);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<any>(null);
  const [page, setPage] = useState(Math.max(1, initialPage));
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const total: number = doc?.numPages ?? 0;

  useEffect(() => {
    setLoading(true); setErr(null); setDoc(null);
    // disableRange/disableStream: one simple download request, which works reliably with signed URLs.
    const task = pdfjs.getDocument({ url, disableRange: true, disableStream: true });
    let cancelled = false;
    task.promise
      .then((d: any) => { if (!cancelled) { setDoc(d); setLoading(false); setPage((p) => (p > d.numPages ? 1 : p)); } })
      .catch((e: unknown) => { if (!cancelled) { setErr(e instanceof Error ? e.message : String(e)); setLoading(false); } });
    return () => { cancelled = true; task.destroy(); };
  }, [url]);

  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    let task: { cancel: () => void; promise: Promise<void> } | undefined;
    let stale = false;
    (async () => {
      const p = await doc.getPage(page);
      const base = p.getViewport({ scale: 1 });
      const avail = Math.max(240, (wrapRef.current?.clientWidth ?? 800) - 16);
      const dpr = lowData ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      const scale = (avail / base.width) * zoom;
      const vp = p.getViewport({ scale: scale * dpr });
      const canvas = canvasRef.current;
      if (!canvas || stale) return;
      canvas.width = vp.width; canvas.height = vp.height;
      canvas.style.width = `${vp.width / dpr}px`; canvas.style.height = `${vp.height / dpr}px`;
      task = p.render({ canvasContext: canvas.getContext('2d'), viewport: vp });
      await task!.promise;
    })().catch((e: any) => { if (e?.name !== 'RenderingCancelledException') setErr(e?.message ?? String(e)); });
    return () => { stale = true; task?.cancel(); };
  }, [doc, page, zoom, lowData]);

  useEffect(() => { if (doc) onPageChange?.(page, total); }, [page, doc]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (n: number) => setPage(Math.min(Math.max(1, n), Math.max(1, total)));
  const zoomBtn = 'btn btn-secondary btn-sm';

  if (err) return <div role="alert" className="card border-red-300 bg-red-50 text-red-900">{t('pdfFailed')} <span className="text-sm">({err})</span></div>;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2" role="toolbar" aria-label={title}>
        <button type="button" className={zoomBtn} onClick={() => go(page - 1)} disabled={page <= 1} aria-label={t('previous')}><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
        <label className="flex items-center gap-2 text-sm">
          <span>{t('page')}</span>
          <input type="number" min={1} max={total || 1} value={page} onChange={(e) => go(Number(e.target.value) || 1)} className="input !mt-0 !min-h-[36px] w-20" />
          <span>/ {total || '–'}</span>
        </label>
        <button type="button" className={zoomBtn} onClick={() => go(page + 1)} disabled={!total || page >= total} aria-label={t('next')}><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
        <span className="mx-2 h-6 w-px bg-slate-300" aria-hidden="true" />
        <button type="button" className={zoomBtn} onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label={t('zoomOut')}><Minus className="h-5 w-5" aria-hidden="true" /></button>
        <span className="min-w-[3.5rem] text-center text-sm" aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button type="button" className={zoomBtn} onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} aria-label={t('zoomIn')}><Plus className="h-5 w-5" aria-hidden="true" /></button>
        <button type="button" className={zoomBtn} onClick={() => setZoom(1)} aria-label={t('zoomReset')}><RotateCcw className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      <div
        ref={wrapRef} tabIndex={0} aria-label={`${title}: ${t('page')} ${page}`}
        onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'PageDown') go(page + 1); if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(page - 1); }}
        className="max-h-[75vh] overflow-auto rounded-lg border border-slate-300 bg-slate-200 p-2"
      >
        {loading ? <Spinner /> : <canvas ref={canvasRef} className="mx-auto block bg-white shadow" role="img" aria-label={`${title}, ${t('page')} ${page}`} />}
      </div>
    </div>
  );
}
