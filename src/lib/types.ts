export type Lang = 'en' | 'ta' | 'si';
export type Medium = 'tamil' | 'sinhala' | 'english';
export type TextSize = 'small' | 'medium' | 'large' | 'xlarge';
export type Verification = 'verified' | 'sample' | 'needs_verification';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QType = 'mcq' | 'true_false' | 'short';

export interface Subject {
  id: string; slug: string; parent_id: string | null;
  name_en: string; name_ta: string; name_si: string;
  sort_order: number; is_active: boolean; is_editable_slot: boolean; official_link: string | null;
}
export interface SubjectGrade {
  id: string; subject_id: string; grade: number; medium: Medium | null; pathway: string | null;
  syllabus_year: number | null; syllabus_version: string | null; school: string | null; term: number | null; note: string | null;
}
export interface Profile {
  id: string; display_name: string | null; grade: number | null; medium: Medium | null; language: Lang;
  text_size: TextSize; low_data: boolean; reminders: boolean; track_activity: boolean;
  subject_ids: string[]; must_change_password: boolean;
}
export interface Resource {
  id: string; title: string; description: string | null; subject_id: string; grade: number; language: Lang;
  term: number | null; lesson: string | null; year: number | null; resource_type: string; source: string;
  source_url: string | null; syllabus_version: string | null; verification: Verification;
  allow_download: boolean; allow_print: boolean; rights_note: string | null; status: 'draft' | 'published';
  file_path: string; file_size: number | null; created_at: string; updated_at: string; published_at: string | null;
}
export interface UserLibrary {
  user_id: string; resource_id: string; is_favourite: boolean; is_bookmarked: boolean;
  last_page: number; last_opened_at: string | null;
}
export interface PublicNote {
  id: string; title: string; body: string; subject_id: string | null; grade: number | null; language: Lang;
  topic: string | null; term: number | null; lesson: string | null; verification: Verification;
  status: 'draft' | 'published'; created_at: string; updated_at: string;
}
export interface PrivateNote {
  id: string; user_id: string; title: string; body: string; subject_id: string | null;
  bookmarked: boolean; created_at: string; updated_at: string;
}
export interface Task {
  id: string; title: string; description: string | null; subject_id: string | null; due_date: string | null;
  priority: 'low' | 'medium' | 'high'; completed: boolean; completed_at: string | null; created_at: string;
}
export interface TimetableSlot {
  id: string; weekday: number; start_time: string; end_time: string; title: string;
  subject_id: string | null; kind: 'class' | 'revision' | 'other';
}
export interface Exam { id: string; title: string; subject_id: string | null; exam_date: string }
export interface Quiz {
  id: string; title: string; description: string | null; subject_id: string | null; grade: number | null;
  language: Lang; topic: string | null; difficulty: Difficulty; source: string | null;
  origin: 'manual' | 'ai_generated'; verification: Verification; status: 'draft' | 'published'; created_at: string;
}
export interface QuizQuestion {
  id: string; quiz_id: string; position: number; qtype: QType; prompt: string; options: string[] | null;
  correct_answer: string; accepted_answers: string[] | null; explanation: string | null; topic: string | null;
}
export interface AttemptAnswer {
  question_id: string; prompt: string; qtype: QType; given: string; expected: string; correct: boolean; explanation: string | null;
}
export interface QuizAttempt {
  id: string; quiz_id: string | null; quiz_title: string; subject_id: string | null; grade: number | null;
  score: number; total: number; answers: AttemptAnswer[]; created_at: string;
}
export interface GlossaryTerm {
  id: string; subject_id: string | null; grade: number | null; language: Lang; term: string; definition: string;
  translation: string | null; translation_language: Lang | null; verification: Verification; status: 'draft' | 'published';
}
export interface ContentReport {
  id: string; resource_id: string | null; kind: string; message: string; grade: number | null;
  subject_id: string | null; status: 'open' | 'resolved' | 'dismissed'; admin_note: string | null; created_at: string;
}
export interface HistoryRow {
  id: number; table_name: string; record_id: string | null; action: string; summary: string | null; changed_at: string;
}
