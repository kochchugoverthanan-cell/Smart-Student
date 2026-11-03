# Smart Student Sri Lanka

A study website for students in Grades 1–13: PDF library, public and private notes, quizzes, planner, calculator, study timer, and read-aloud / dictation, in **Tamil, Sinhala and English**. Built on the existing Bolt project stack: Vite + React + TypeScript + Tailwind + Supabase (Auth, Postgres with Row Level Security, Storage, Edge Functions).

> **Read this first: honest status.** This build was written and syntax-checked in an environment with no internet, so it has **not** been installed, type-checked, compiled or opened in a browser. Expect to run `npm install` and `npm run build` once and fix any small type errors that appear. The database files and Edge Functions have also not been run against a live Supabase project. Nothing here claims to be tested end to end.

## What works in this build

| Area | What is in the code |
|---|---|
| Site shell | Responsive layout, Tamil / Sinhala / English selector, text-size and low-data settings, skip link, visible focus, reduced-motion support |
| Accounts | Sign-up, sign-in, sign-out, password reset (Supabase Auth); profile with grade, medium, language, subjects, text size, reminders and activity preferences |
| Dashboard | Selected subjects, recent and saved PDFs, upcoming tasks, quiz and focus-time summary, optional in-app reminder banner |
| PDF library | Filters (grade, subject, AES sub-category, language, term, lesson, year, type), on-page reader with page navigation and zoom, favourites, bookmarks, recently viewed, continue from last page, download / print only when permitted, report a problem, "Sample / Needs verification / Verified" labels |
| Notes | Public notes (admin-published, searchable) and private notes (create, edit, search, bookmark, delete, export as a text file) |
| Quizzes | Multiple choice, true/false, short answer; filters; answers and explanations; review of wrong answers; private history; private "mistakes notebook" |
| Planner | Tasks (pending / completed / overdue), weekly timetable with revision slots, exam countdown |
| Tools | **English-only** calculator (safe parser, no `eval`), Pomodoro timer (no sign-in needed), read-aloud and dictation (only where the browser supports the language) |
| Glossary | Searchable, admin-managed, optional translations with their own verification label |
| Admin console | PDF upload (validated, with progress), publish/unpublish/replace/delete, public notes, quizzes and questions, glossary, subjects and grade mappings, reports queue, change history |
| Backend | 4 SQL migrations (schema, RLS, storage, seed), `setup-admin` and `delete-account` Edge Functions |
| Extras | Installable app (PWA shell), account deletion, data export of own notes |

The **About** page lists all 60 optional modules and marks only the ones that really work as "Available" (15 of them). The other 45 are planned, not shown as buttons anywhere.

### Deliberately not built (so no dead buttons exist)
- AI question generation and OCR. They need a paid external service and a server-side key. The database already has `origin = 'ai_generated'`, `verification` and draft/publish states so the review workflow is ready. See `docs/ROADMAP.md`.
- Teacher accounts, classes, assignments, announcements. The `teacher` role exists in the database but nothing grants it or uses it yet.
- Offline PDFs, study packs, audio playlists, captions, push notifications.
- Cloud text-to-speech / speech-to-text. Voice uses the browser's own features only.

## Run locally

```bash
npm install
cp .env.example .env      # then fill in the two public values
npm run dev               # http://localhost:5173
npm run build             # type-check + production build
```

If `npm run build` reports a type error, it will name the file and line. Most likely candidates are small typing details in the Supabase calls or the pdf.js import (`src/vite-env.d.ts` declares a minimal type for it).

## Supabase setup (once)

1. Create (or use the already connected) Supabase project.
2. **Public settings** for the website (`.env`, safe in the browser):
   - `VITE_SUPABASE_URL` – Project URL
   - `VITE_SUPABASE_ANON_KEY` – the *anon / public* key
3. Run the migrations **in order** in the SQL Editor (or `supabase db push`):
   1. `supabase/migrations/20260101000001_schema.sql`
   2. `supabase/migrations/20260101000002_rls.sql`
   3. `supabase/migrations/20260101000003_storage.sql`
   4. `supabase/migrations/20260101000004_seed_subjects.sql`
4. In the Supabase dashboard under **Authentication**: keep email confirmation on; set the minimum password length to at least 8; set the **Site URL** to your website address and add `https://YOUR-SITE/reset-password` to the redirect URLs. (Menu names change over time.)
5. Deploy the two Edge Functions: `supabase functions deploy setup-admin` and `supabase functions deploy delete-account` (or ask Bolt to deploy the files in `supabase/functions/`).

### Which values are public and which are secret

| Value | Where | Safe in browser? |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | `.env` / hosting environment | Yes. Protected by Row Level Security |
| `SUPABASE_SERVICE_ROLE_KEY` | Supplied to Edge Functions automatically | **Never.** Not used anywhere in `src/` |
| `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`, `SETUP_TOKEN` | Edge Function secrets | **Never.** Server-side only |
| Any future AI / OCR / speech API key | Edge Function secrets | **Never** |

## Creating the first administrator (one time)

The temporary password never appears in the website code, in the database, or in any file here. It lives only as a server secret.

1. Set three secrets (CLI, or dashboard → Edge Functions → Secrets):
   ```bash
   supabase secrets set INITIAL_ADMIN_EMAIL="you@example.com" \
                        INITIAL_ADMIN_PASSWORD="<temporary password>" \
                        SETUP_TOKEN="<a long random string only you know>"
   ```
2. Open `https://YOUR-SITE/setup`, type the setup token, press **Create administrator**. (Or call the function with `curl -X POST https://<ref>.supabase.co/functions/v1/setup-admin -H "Authorization: Bearer <anon key>" -H "x-setup-token: <token>"`.)
3. Sign in at `/signin` with the email and the temporary password. You are taken to a screen that forces a new password (12+ characters, different from the temporary one).
4. Remove the secrets: `supabase secrets unset INITIAL_ADMIN_EMAIL INITIAL_ADMIN_PASSWORD SETUP_TOKEN`.

How it is protected: the function runs only with the correct token, refuses to run if setup is already marked done or any admin exists, and cannot create a second admin. Public sign-up can never create an admin. Until the password is changed, the **database** treats the account as having no admin powers (`is_admin()` is false while `must_change_password` is true), and the browser cannot switch that flag off (column privileges), only the `complete_forced_password_change()` function can, and only if the stored password hash really changed.

> **About the temporary password `1010`.** You asked for it, and it is handled as a server secret only. But please know two things. (1) It is 4 characters, and Supabase Auth enforces a minimum password length (6 by default), so Supabase may reject it; the setup screen will show Supabase's message. (2) Until you change it, **anyone who knows the admin email and that password could sign in, change the password themselves and become the administrator.** A 4-digit value is guessable in minutes. Safer: choose a longer one-time value, run the setup and change the password immediately, and use an admin email address that is not published anywhere.

## Running the site: content workflow

1. Sign in as administrator → **Admin**.
2. **Subjects**: rename the "Other subject" slot (marked ★) once you decide its name. Use **Grades** to say which grades, mediums, pathways, terms and syllabus versions a subject applies to. Until a subject has a mapping it is offered for every grade. New subjects beyond the 13 slots can be added with SQL (insert into `public.subjects`).
3. **PDFs**: upload (PDF only, up to 50 MB, checked by file type, size and PDF header), fill the metadata, choose the right verification label, tick download/print only if the copyright holder allows it, then **Publish**. Students only ever see published items.
4. **Notes, Quizzes, Glossary**: same draft → publish flow. Any quiz you paste in from an AI tool must be marked "AI-generated (needs review)", checked by a person, then published.
5. **Reports**: students' broken / wrong / outdated reports and resource requests arrive here (reporter identity is not shown).
6. **History**: who changed which public item and when.

Official links to keep current: NIE syllabus selector (https://www.nie.lk/selesyll), NIE 13 Years Guaranteed Education Program (https://www.nie.lk/dispndoc2), e-Thaksalawa (https://e-thaksalawa.moe.gov.lk/lcms/?lang=en). They are listed in `src/lib/constants.ts` (`OFFICIAL_LINKS`) and on the Home and About pages.

## Security model in plain words

The browser is never trusted. Every rule is enforced by Postgres (Row Level Security) and Storage policies:

| Data | Who can read | Who can change |
|---|---|---|
| Profile, private notes, tasks, timetable, exams, quiz history, focus log, library state | Only that student | Only that student |
| Published PDFs, notes, quizzes, glossary, subjects | Everyone (even signed out) | Administrators only |
| Drafts | Administrators only | Administrators only |
| PDF files | Anyone, but only files of **published** items (admins see all) | Administrators only; bucket accepts only `application/pdf` up to 50 MB |
| Reports / requests | The reporter and administrators | Administrators (status, notes) |
| Roles | Own role only | Nobody from the browser |
| Setup lock table | Nobody from the browser | Server only |

Other safeguards: per-student row limits (notes 500, tasks 1000 and so on), at most 20 reports per student per day, a search-input sanitiser, signed URLs that expire, no public profiles, no chat, no rankings, no social sign-in.

Please note two honest limits. (1) The on-page reader must download a PDF to show it, so "no download" hides the button; it cannot stop a determined person from saving what they can view. If a publisher forbids any copying, do not upload that file. (2) Quiz answers are readable by anyone who can open a quiz (it is practice, not a secure exam). Server-side grading would be a later phase.

## Privacy, retention and deletion

- Collected: email, optional name, grade, medium, language, subjects, and what the student creates. Activity saving (recent PDFs, last page, quiz results, focus sessions) can be switched off in the profile.
- Audio is never recorded or stored by this site. Dictation uses the browser's speech service; some browsers send speech to the browser maker's servers, and the page says so before the student starts.
- **Account deletion** is built in (Privacy page → `delete-account` function). Everything personal is linked with `ON DELETE CASCADE`.
- Suggested retention (your decision, not automatic): remove accounts inactive for 12 months after an email notice; delete resolved reports after 12 months, for example `delete from public.content_reports where status <> 'open' and created_at < now() - interval '12 months';`. Under-age safeguards and local legal requirements should be confirmed with a qualified adviser.

## Deployment

Any static host works (Netlify, Vercel, Cloudflare Pages, GitHub Pages with a SPA fallback). Build command `npm run build`, output `dist`, set the two `VITE_` variables in the host's settings, and make unknown paths serve `index.html` (single-page app). Then set the Supabase **Site URL** and redirect URLs to the final address.

## Costs of optional services (check current prices before enabling)

| Service | Why | What drives cost |
|---|---|---|
| Supabase plan | Database, Auth, Storage, Edge Functions | Storage size, **bandwidth** (PDFs are large and are the main cost for a national site), active users, emails. A free tier is fine for testing; a national launch will probably need a paid plan |
| Email sending | Sign-up and password-reset emails | Supabase's built-in sender is rate-limited; production normally needs your own SMTP provider |
| AI question drafting (not built) | Draft questions from materials | Per-token pricing from the AI provider, plus an Edge Function and admin review time |
| OCR for scanned PDFs (not built) | Searchable text | Usually per page |
| Cloud speech (not built) | Better Tamil / Sinhala voices and dictation | Usually per character / per minute. The built-in browser voices are free but vary by device |
| Domain, hosting, SMS reminders | Public address, delivery | Domain yearly; static hosting often free at small scale; SMS per message |

## What still needs a human to verify

- **Tamil and Sinhala interface text** in `src/lib/i18n.ts` (written by an AI, not by a native-speaking reviewer) and the Tamil/Sinhala subject names in the seed migration.
- **Every PDF, note, quiz and glossary entry** before it is labelled "Verified", including copyright permission.
- That the three official links and the subject list match what you intend; this build contains no syllabus content, exam dates, papers or answer keys.
- Legal items: privacy policy wording, children's data rules, and terms of use.
- The Supabase dashboard menu names and the exact limits of your plan.

## Project layout

```
src/lib        constants, i18n (3 languages), Supabase client, helpers
src/stores     auth, settings, subject catalogue (Zustand)
src/components layout, reader, read-aloud, guards, shared UI
src/pages      student pages;  src/pages/admin  administrator console
supabase/migrations   4 SQL files      supabase/functions   2 Edge Functions
docs/          TAMIL_SETUP.md, ROADMAP.md, FEATURE_IDEAS_1000.md
```
