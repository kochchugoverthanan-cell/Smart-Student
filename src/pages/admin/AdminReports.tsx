import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Async, Badge } from '../../components/ui';
import { unwrap, useLoad } from '../../lib/hooks';
import { supabase } from '../../lib/supabase';
import type { ContentReport, HistoryRow } from '../../lib/types';
import { useCatalog } from '../../stores/catalog';
import { Table } from './common';

export function AdminReports() {
  const subjects = useCatalog((s) => s.subjects);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data, loading, error, reload } = useLoad(async () => unwrap<ContentReport[]>(await supabase.from('content_reports').select('*').order('created_at', { ascending: false }).limit(200)), []);
  async function resolve(r: ContentReport, status: 'resolved' | 'dismissed' | 'open') {
    const { error: err } = await supabase.from('content_reports').update({ status, admin_note: notes[r.id]?.trim() || r.admin_note }).eq('id', r.id);
    if (err) return toast.error(err.message); reload();
  }
  const sorted = [...(data ?? [])].sort((a, b) => Number(b.status === 'open') - Number(a.status === 'open'));
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Reports and requests</h2>
      <p className="text-sm text-slate-700">Reporter identities are not shown here. Students are never shown each other’s reports.</p>
      <Async loading={loading} error={error} onRetry={reload} empty={sorted.length === 0} emptyText="No reports yet.">
        <ul className="space-y-3">
          {sorted.map((r) => (
            <li key={r.id} className="card">
              <div className="mb-1 flex flex-wrap items-center gap-2"><Badge tone={r.status === 'open' ? 'amber' : 'slate'}>{r.status}</Badge><Badge tone="blue">{r.kind.replace('_', ' ')}</Badge>
                {r.grade && <Badge>Grade {r.grade}</Badge>}{r.subject_id && <Badge>{subjects.find((s) => s.id === r.subject_id)?.name_en}</Badge>}<span className="text-sm text-slate-600">{r.created_at.slice(0, 10)}</span></div>
              <p className="whitespace-pre-wrap">{r.message}</p>
              {r.resource_id && <Link className="text-sm underline" to={`/library/${r.resource_id}`}>Open the PDF</Link>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input className="input !mt-0 max-w-xs" placeholder="Internal note (optional)" defaultValue={r.admin_note ?? ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} aria-label="Internal note" />
                {r.status === 'open' ? (<><button type="button" className="btn btn-primary btn-sm" onClick={() => void resolve(r, 'resolved')}>Mark resolved</button><button type="button" className="btn btn-secondary btn-sm" onClick={() => void resolve(r, 'dismissed')}>Dismiss</button></>) : <button type="button" className="btn btn-secondary btn-sm" onClick={() => void resolve(r, 'open')}>Reopen</button>}
              </div>
            </li>
          ))}
        </ul>
      </Async>
    </div>
  );
}

export function AdminHistory() {
  const { data, loading, error, reload } = useLoad(async () => unwrap<HistoryRow[]>(await supabase.from('content_history').select('*').order('changed_at', { ascending: false }).limit(150)), []);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Change history (public content)</h2>
      <Async loading={loading} error={error} onRetry={reload} empty={(data ?? []).length === 0} emptyText="Nothing has changed yet.">
        <Table head={['When', 'Area', 'Action', 'Item']}>
          {(data ?? []).map((h) => <tr key={h.id}><td className="px-3 py-2">{h.changed_at.slice(0, 16).replace('T', ' ')}</td><td className="px-3">{h.table_name}</td><td className="px-3">{h.action}</td><td className="px-3">{h.summary}</td></tr>)}
        </Table>
      </Async>
    </div>
  );
}
