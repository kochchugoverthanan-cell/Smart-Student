import { useState } from 'react';
import { Async, PageHeader } from '../../components/ui';
import { useLoad } from '../../lib/hooks';
import { supabase } from '../../lib/supabase';
import AdminNotes from './AdminNotes';
import AdminQuizzes from './AdminQuizzes';
import AdminResources from './AdminResources';
import { AdminGlossary, AdminSubjects } from './AdminContent';
import { AdminHistory, AdminReports } from './AdminReports';

const TABS = ['Overview', 'PDFs', 'Notes', 'Quizzes', 'Glossary', 'Subjects', 'Reports', 'History'] as const;
type Tab = (typeof TABS)[number];

async function count(table: string, filter?: [string, string]) {
  let q = supabase.from(table).select('id', { count: 'exact', head: true });
  if (filter) q = q.eq(filter[0], filter[1]);
  const { count: n, error } = await q;
  if (error) throw new Error(error.message);
  return n ?? 0;
}

function Overview() {
  const { data, loading, error, reload } = useLoad(async () => ({
    pdfsPublished: await count('resources', ['status', 'published']), pdfsDraft: await count('resources', ['status', 'draft']),
    notes: await count('notes_public', ['status', 'published']), quizzes: await count('quizzes', ['status', 'published']),
    openReports: await count('content_reports', ['status', 'open']),
  }), []);
  const items: [string, number | undefined][] = [['Published PDFs', data?.pdfsPublished], ['Draft PDFs', data?.pdfsDraft], ['Published notes', data?.notes], ['Published quizzes', data?.quizzes], ['Open reports', data?.openReports]];
  return (
    <Async loading={loading} error={error} onRetry={reload}>
      <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map(([label, n]) => <li key={label} className="card text-center"><p className="text-3xl font-bold text-primary-800">{n ?? 0}</p><p className="text-sm text-slate-700">{label}</p></li>)}
      </ul>
      <div className="card mt-4 space-y-2 text-slate-800">
        <p>Everything students see comes from items marked <strong>published</strong>. New items start as drafts.</p>
        <p>Label content honestly: use “Needs verification” or “Sample” until someone has checked it against an official source.</p>
        <p>This administrator console is in English. Student pages are in Tamil, Sinhala and English.</p>
      </div>
    </Async>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('Overview');
  return (
    <div lang="en">
      <PageHeader title="Administrator" subtitle="Manage learning content. Changes are recorded in the change history." />
      <div role="tablist" aria-label="Administrator sections" className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} className="tab" onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {tab === 'Overview' && <Overview />}
      {tab === 'PDFs' && <AdminResources />}
      {tab === 'Notes' && <AdminNotes />}
      {tab === 'Quizzes' && <AdminQuizzes />}
      {tab === 'Glossary' && <AdminGlossary />}
      {tab === 'Subjects' && <AdminSubjects />}
      {tab === 'Reports' && <AdminReports />}
      {tab === 'History' && <AdminHistory />}
    </div>
  );
}
