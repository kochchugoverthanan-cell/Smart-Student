-- =====================================================================
-- 2/4: Row Level Security. The database - not the website - decides who can see or change what.
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.app_setup enable row level security;
alter table public.subjects enable row level security;
alter table public.subject_grades enable row level security;
alter table public.resources enable row level security;
alter table public.user_library enable row level security;
alter table public.content_reports enable row level security;
alter table public.notes_public enable row level security;
alter table public.saved_notes enable row level security;
alter table public.notes_private enable row level security;
alter table public.tasks enable row level security;
alter table public.timetable_slots enable row level security;
alter table public.exams enable row level security;
alter table public.study_sessions enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.glossary_terms enable row level security;
alter table public.content_history enable row level security;

-- ---- profiles: a student sees and edits only their own row, and only these columns ----
create policy "profile: read own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profile: update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke insert, delete, update on public.profiles from anon, authenticated;
grant update (display_name, grade, medium, language, text_size, low_data, reminders, track_activity, subject_ids) on public.profiles to authenticated;
-- must_change_password is NOT in that list, so a user can never switch the lock off themselves.

-- ---- roles: you can read your own role; nobody can write roles from the browser ----
create policy "roles: read own" on public.user_roles for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.user_roles from anon, authenticated;

-- ---- setup lock: no browser access at all (policies: none, grants: none) ----
revoke all on public.app_setup from anon, authenticated;

-- ---- subjects and grade mappings: public to read, administrators to change ----
create policy "subjects: read" on public.subjects for select to anon, authenticated using (is_active or public.is_admin());
create policy "subjects: admin write" on public.subjects for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "subject_grades: read" on public.subject_grades for select to anon, authenticated using (true);
create policy "subject_grades: admin write" on public.subject_grades for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- PDF library ----
create policy "resources: read published" on public.resources for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy "resources: admin write" on public.resources for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "user_library: own" on public.user_library for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- reports: any signed-in student may send one; only they and administrators can read it ----
create policy "reports: insert own" on public.content_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports: read own or admin" on public.content_reports for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
create policy "reports: admin update" on public.content_reports for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "reports: admin delete" on public.content_reports for delete to authenticated using (public.is_admin());

-- ---- notes ----
create policy "notes_public: read published" on public.notes_public for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy "notes_public: admin write" on public.notes_public for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "saved_notes: own" on public.saved_notes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notes_private: own" on public.notes_private for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- planner and activity: strictly own rows ----
create policy "tasks: own" on public.tasks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "timetable: own" on public.timetable_slots for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "exams: own" on public.exams for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sessions: own" on public.study_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "attempts: own" on public.quiz_attempts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- quizzes ----
create policy "quizzes: read published" on public.quizzes for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy "quizzes: admin write" on public.quizzes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "questions: read when quiz published" on public.quiz_questions for select to anon, authenticated
  using (public.is_admin() or exists (select 1 from public.quizzes q where q.id = quiz_id and q.status = 'published'));
create policy "questions: admin write" on public.quiz_questions for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- glossary ----
create policy "glossary: read published" on public.glossary_terms for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy "glossary: admin write" on public.glossary_terms for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- change history: administrators read; only triggers write ----
create policy "history: admin read" on public.content_history for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.content_history from anon, authenticated;

-- Anonymous visitors get no access to private tables because no policy grants it; also remove table grants for clarity.
revoke all on public.user_library, public.notes_private, public.saved_notes, public.tasks, public.timetable_slots, public.exams,
  public.study_sessions, public.quiz_attempts, public.content_reports, public.content_history, public.profiles, public.user_roles from anon;
