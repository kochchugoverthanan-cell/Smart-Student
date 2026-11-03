import type { Lang, Medium } from './types';

export const GRADES = Array.from({ length: 13 }, (_, i) => i + 1);

export const LANGUAGES: { code: Lang; label: string; english: string; stt: string }[] = [
  { code: 'en', label: 'English', english: 'English', stt: 'en-US' },
  { code: 'ta', label: 'தமிழ்', english: 'Tamil', stt: 'ta-LK' },
  { code: 'si', label: 'සිංහල', english: 'Sinhala', stt: 'si-LK' },
];

export const MEDIUMS: { code: Medium; label: string }[] = [
  { code: 'tamil', label: 'தமிழ் / Tamil' },
  { code: 'sinhala', label: 'සිංහල / Sinhala' },
  { code: 'english', label: 'English' },
];

export const RESOURCE_TYPES = ['textbook', 'teacher_guide', 'past_paper', 'worksheet', 'syllabus', 'study_notes', 'other'];
export const VERIFICATIONS = ['verified', 'sample', 'needs_verification'] as const;
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const PRIORITIES = ['low', 'medium', 'high'] as const;
export const QTYPES = ['mcq', 'true_false', 'short'] as const;
export const TERMS = [1, 2, 3];
export const MAX_PDF_BYTES = 50 * 1024 * 1024; // must match the storage bucket limit in the migration

export const OFFICIAL_LINKS = [
  { href: 'https://www.nie.lk/selesyll', label: 'NIE syllabus selector' },
  { href: 'https://www.nie.lk/dispndoc2', label: 'NIE 13 Years Guaranteed Education Program' },
  { href: 'https://e-thaksalawa.moe.gov.lk/lcms/?lang=en', label: 'e-Thaksalawa' },
];

export function localeFor(lang: Lang): string {
  return lang === 'ta' ? 'ta-LK' : lang === 'si' ? 'si-LK' : 'en-GB';
}
export function langEnglishName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.english ?? code;
}
/** Remove characters that would break a PostgREST filter string. */
export function cleanQuery(s: string): string {
  return s.replace(/[%,()*\\]/g, ' ').trim();
}
export function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
export function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86400000);
}
export function download(filename: string, text: string, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
