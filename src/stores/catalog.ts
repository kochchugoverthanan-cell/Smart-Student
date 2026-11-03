import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Lang, Subject, SubjectGrade } from '../lib/types';
import { useSettings } from './settings';

interface CatalogState {
  subjects: Subject[];
  grades: SubjectGrade[];
  loaded: boolean;
  load: () => Promise<void>;
}

export const useCatalog = create<CatalogState>((set) => ({
  subjects: [],
  grades: [],
  loaded: false,
  load: async () => {
    const [s, g] = await Promise.all([
      supabase.from('subjects').select('*').order('sort_order'),
      supabase.from('subject_grades').select('*'),
    ]);
    set({ subjects: (s.data ?? []) as Subject[], grades: (g.data ?? []) as SubjectGrade[], loaded: true });
  },
}));

export function subjectName(s: Subject | undefined, lang: Lang): string {
  if (!s) return '';
  const n = lang === 'ta' ? s.name_ta : lang === 'si' ? s.name_si : s.name_en;
  return n || s.name_en;
}

/** Returns a function: subject id -> name in the current interface language. */
export function useSubjectName() {
  const lang = useSettings((s) => s.language);
  const subjects = useCatalog((s) => s.subjects);
  return (id?: string | null) => subjectName(subjects.find((x) => x.id === id), lang);
}

/** Top-level, active subjects (what students see). */
export function useTopSubjects(): Subject[] {
  const subjects = useCatalog((s) => s.subjects);
  return subjects.filter((s) => s.parent_id === null && s.is_active);
}
