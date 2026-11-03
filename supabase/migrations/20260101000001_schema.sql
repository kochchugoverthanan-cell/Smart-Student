-- =====================================================================
-- Smart Student Sri Lanka - 1/4: tables, functions and triggers
-- Run the four migration files in order (see README.md).
-- =====================================================================

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- accounts ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  grade smallint check (grade between 1 and 13),
  medium text check (medium in ('tamil','sinhala','english')),
  language text not null default 'en' check (language in ('en','ta','si')),
  text_size text not null default 'medium' check (text_size in ('small','medium','large','xlarge')),
  low_data boolean not null default false,
  reminders boolean not null default false,
  track_activity boolean not null default true,
  subject_ids uuid[] not null default '{}',
  must_change_password boolean not null default false,   -- only the server can change this (see 002_rls.sql)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- Roles are only ever written by the server (Edge Function or SQL editor), never by the browser.
create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','teacher')),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- One row. Locks the one-time administrator setup. Not readable by anyone except the server.
create table public.app_setup (
  id int primary key default 1 check (id = 1),
  admin_setup_done boolean not null default false,
  admin_user_id uuid,
  initial_password_hash text,
  completed_at timestamptz
);
insert into public.app_setup (id) values (1) on conflict do nothing;

-- ---------- subjects ----------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  parent_id uuid references public.subjects(id) on delete cascade,   -- AES sub-categories point at AES
  name_en text not null,
  name_ta text not null,
  name_si text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  is_editable_slot boolean not null default false,                    -- the administrator-named "Other subject"
  official_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subjects_touch before update on public.subjects for each row execute function public.touch_updated_at();

-- Which grades / mediums / pathways / syllabus versions a subject applies to (administrator-maintained).
create table public.subject_grades (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  grade smallint not null check (grade between 1 and 13),
  medium text check (medium in ('tamil','sinhala','english')),
  pathway text check (pathway in ('primary','junior_secondary','ol','al')),
  syllabus_year smallint check (syllabus_year between 1950 and 2100),
  syllabus_version text,
  school text,
  term smallint check (term between 1 and 3),
  note text,
  created_at timestamptz not null default now()
);
create index on public.subject_grades (subject_id, grade);

-- ---------- PDF library ----------
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 200),
  description text check (char_length(description) <= 2000),
  subject_id uuid not null references public.subjects(id) on delete restrict,
  grade smallint not null check (grade between 1 and 13),
  language text not null check (language in ('en','ta','si')),
  term smallint check (term between 1 and 3),
  lesson text,
  year smallint check (year between 1950 and 2100),
  resource_type text not null default 'other' check (resource_type in ('textbook','teacher_guide','past_paper','worksheet','syllabus','study_notes','other')),
  source text not null default 'Not stated',
  source_url text,
  syllabus_version text,
  verification text not null default 'needs_verification' check (verification in ('verified','sample','needs_verification')),
  allow_download boolean not null default false,
  allow_print boolean not null default false,
  rights_note text,
  status text not null default 'draft' check (status in ('draft','published')),
  file_path text not null unique,
  file_size bigint check (file_size <= 52428800),
  uploaded_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index on public.resources (status, grade, subject_id);
create trigger resources_touch before update on public.resources for each row execute function public.touch_updated_at();

-- A student's private relationship to a PDF: favourite, bookmark, recently opened, last page.
create table public.user_library (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  is_favourite boolean not null default false,
  is_bookmarked boolean not null default false,
  last_page int not null default 1 check (last_page >= 1),
  last_opened_at timestamptz,
  primary key (user_id, resource_id)
);

-- Reports about resources, content feedback and resource requests. The reporter is hidden from other students.
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid references public.resources(id) on delete set null,
  kind text not null check (kind in ('broken','incorrect','outdated','other','resource_request')),
  message text not null check (char_length(message) between 5 and 2000),
  grade smallint check (grade between 1 and 13),
  subject_id uuid references public.subjects(id) on delete set null,
  reporter_id uuid default auth.uid() references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  admin_note text,
  created_at timestamptz not null default now()
);
create index on public.content_reports (status, created_at desc);

-- ---------- notes ----------
create table public.notes_public (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) <= 20000),
  subject_id uuid references public.subjects(id) on delete set null,
  grade smallint check (grade between 1 and 13),
  language text not null default 'en' check (language in ('en','ta','si')),
  topic text, term smallint check (term between 1 and 3), lesson text,
  verification text not null default 'needs_verification' check (verification in ('verified','sample','needs_verification')),
  status text not null default 'draft' check (status in ('draft','published')),
  author_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index on public.notes_public (status, grade);
create trigger notes_public_touch before update on public.notes_public for each row execute function public.touch_updated_at();

create table public.saved_notes (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  note_id uuid not null references public.notes_public(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, note_id)
);

create table public.notes_private (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 20000),
  subject_id uuid references public.subjects(id) on delete set null,
  bookmarked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.notes_private (user_id, updated_at desc);
create trigger notes_private_touch before update on public.notes_private for each row execute function public.touch_updated_at();

-- ---------- planner ----------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 2000),
  subject_id uuid references public.subjects(id) on delete set null,
  due_date date,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.tasks (user_id, completed, due_date);

create table public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  weekday smallint not null check (weekday between 0 and 6),   -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  title text not null check (char_length(title) between 1 and 120),
  subject_id uuid references public.subjects(id) on delete set null,
  kind text not null default 'class' check (kind in ('class','revision','other')),
  check (end_time > start_time)
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 120),
  subject_id uuid references public.subjects(id) on delete set null,
  exam_date date not null
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  minutes int not null check (minutes between 1 and 180),
  started_at timestamptz not null default now(),
  subject_id uuid references public.subjects(id) on delete set null
);

-- ---------- quizzes ----------
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text,
  subject_id uuid references public.subjects(id) on delete set null,
  grade smallint check (grade between 1 and 13),
  language text not null default 'en' check (language in ('en','ta','si')),
  topic text,
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  source text,                                                        -- the learning material the questions are based on
  origin text not null default 'manual' check (origin in ('manual','ai_generated')),
  verification text not null default 'needs_verification' check (verification in ('verified','sample','needs_verification')),
  status text not null default 'draft' check (status in ('draft','published')),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.quizzes (status, grade, subject_id);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  position int not null default 1,
  qtype text not null check (qtype in ('mcq','true_false','short')),
  prompt text not null check (char_length(prompt) between 1 and 2000),
  options jsonb,                                  -- array of strings for multiple choice
  correct_answer text not null,                   -- mcq: option index; true_false: 'true'/'false'; short: text
  accepted_answers text[] not null default '{}',
  explanation text,
  topic text
);
create index on public.quiz_questions (quiz_id, position);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  quiz_id uuid references public.quizzes(id) on delete set null,
  quiz_title text not null,
  subject_id uuid references public.subjects(id) on delete set null,
  grade smallint,
  score int not null check (score >= 0),
  total int not null check (total >= 0),
  answers jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index on public.quiz_attempts (user_id, created_at desc);

-- ---------- glossary ----------
create table public.glossary_terms (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.subjects(id) on delete set null,
  grade smallint check (grade between 1 and 13),
  language text not null default 'en' check (language in ('en','ta','si')),
  term text not null check (char_length(term) between 1 and 200),
  definition text not null check (char_length(definition) <= 4000),
  translation text,
  translation_language text check (translation_language in ('en','ta','si')),
  verification text not null default 'needs_verification' check (verification in ('verified','sample','needs_verification')),
  status text not null default 'draft' check (status in ('draft','published'))
);
create index on public.glossary_terms (status, term);

-- ---------- change history of public content ----------
create table public.content_history (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text,
  action text not null,
  summary text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

-- ======================= functions =======================

-- True only for a real administrator who has already replaced the temporary password.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles r
    join public.profiles p on p.id = r.user_id
    where r.user_id = auth.uid() and r.role = 'admin' and p.must_change_password = false
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Creates the profile row when someone registers. Only safe, validated fields are copied from sign-up data.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, display_name, grade, medium, language)
  values (
    new.id,
    nullif(left(coalesce(m->>'display_name', ''), 80), ''),
    case when (m->>'grade') ~ '^[0-9]{1,2}$' and (m->>'grade')::int between 1 and 13 then (m->>'grade')::smallint end,
    case when m->>'medium' in ('tamil','sinhala','english') then m->>'medium' end,
    case when m->>'language' in ('en','ta','si') then m->>'language' else 'en' end
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Records who changed public content, and what.
create or replace function public.log_content_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare rec jsonb;
begin
  if tg_op = 'DELETE' then rec := to_jsonb(old); else rec := to_jsonb(new); end if;
  insert into public.content_history (table_name, record_id, action, summary, changed_by)
  values (
    tg_table_name, rec->>'id', tg_op,
    coalesce(rec->>'title', rec->>'term', rec->>'name_en', rec->>'slug') || case when rec ? 'status' then ' [' || (rec->>'status') || ']' else '' end,
    auth.uid()
  );
  return null;
end $$;
create trigger log_resources after insert or update or delete on public.resources for each row execute function public.log_content_change();
create trigger log_notes_public after insert or update or delete on public.notes_public for each row execute function public.log_content_change();
create trigger log_quizzes after insert or update or delete on public.quizzes for each row execute function public.log_content_change();
create trigger log_glossary after insert or update or delete on public.glossary_terms for each row execute function public.log_content_change();
create trigger log_subjects after insert or update or delete on public.subjects for each row execute function public.log_content_change();

-- Simple per-student row limits so nobody can fill the database. Limit is the trigger argument.
create or replace function public.enforce_row_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim int; n bigint;
begin
  lim := tg_argv[0]::int;
  execute format('select count(*) from %I.%I where user_id = $1', tg_table_schema, tg_table_name) into n using new.user_id;
  if n >= lim then raise exception 'limit reached: you cannot store more than % items here', lim; end if;
  return new;
end $$;
create trigger limit_notes_private before insert on public.notes_private for each row execute function public.enforce_row_limit('500');
create trigger limit_tasks before insert on public.tasks for each row execute function public.enforce_row_limit('1000');
create trigger limit_timetable before insert on public.timetable_slots for each row execute function public.enforce_row_limit('300');
create trigger limit_exams before insert on public.exams for each row execute function public.enforce_row_limit('100');
create trigger limit_sessions before insert on public.study_sessions for each row execute function public.enforce_row_limit('5000');
create trigger limit_attempts before insert on public.quiz_attempts for each row execute function public.enforce_row_limit('2000');

-- At most 20 reports / requests per student per day.
create or replace function public.limit_reports() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.content_reports where reporter_id = new.reporter_id and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'too many reports today';
  end if;
  return new;
end $$;
create trigger limit_reports before insert on public.content_reports for each row execute function public.limit_reports();

-- Used only by the setup Edge Function (service role): remembers the temporary password's hash.
create or replace function public.record_initial_password_hash(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  update public.app_setup
     set initial_password_hash = (select encrypted_password from auth.users where id = p_user), admin_user_id = p_user
   where id = 1;
end $$;
revoke all on function public.record_initial_password_hash(uuid) from public, anon, authenticated;
grant execute on function public.record_initial_password_hash(uuid) to service_role;

-- Called by the browser right after the administrator sets a new password.
-- It only clears the lock if the stored password hash really changed.
create or replace function public.complete_forced_password_change() returns boolean
language plpgsql security definer set search_path = public, auth as $$
declare h text; cur text;
begin
  if auth.uid() is null then return false; end if;
  select initial_password_hash into h from public.app_setup where id = 1 and admin_user_id = auth.uid();
  select encrypted_password into cur from auth.users where id = auth.uid();
  if h is not null and cur is not distinct from h then return false; end if;
  update public.profiles set must_change_password = false where id = auth.uid();
  return true;
end $$;
revoke all on function public.complete_forced_password_change() from public, anon;
grant execute on function public.complete_forced_password_change() to authenticated;
