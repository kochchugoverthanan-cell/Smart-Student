import type { ReactNode } from 'react';
import { useCatalog } from '../../stores/catalog';
import type { Subject } from '../../lib/types';

/** Subject label for admin lists: children show as "Parent › Child". */
export function adminSubjectLabel(s: Subject, all: Subject[]): string {
  const parent = s.parent_id ? all.find((p) => p.id === s.parent_id) : undefined;
  return `${parent ? `${parent.name_en} › ` : ''}${s.name_en}${s.is_active ? '' : ' (hidden)'}`;
}

export function SubjectOptions({ allowEmpty = false }: { allowEmpty?: boolean }) {
  const subjects = useCatalog((s) => s.subjects);
  return (
    <>
      <option value="">{allowEmpty ? '— none —' : 'Choose…'}</option>
      {subjects.map((s) => <option key={s.id} value={s.id}>{adminSubjectLabel(s, subjects)}</option>)}
    </>
  );
}

export const LANG_OPTIONS = [['en', 'English'], ['ta', 'Tamil'], ['si', 'Sinhala']];
export const VERIFY_OPTIONS = [['needs_verification', 'Needs verification'], ['sample', 'Sample'], ['verified', 'Verified']];

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="bg-slate-100"><tr>{head.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}
