# Roadmap: from the working core to the full vision

Status key: **Done** = in this build · **Next** = recommended order · each phase lists what it depends on, outside services, and what drives cost. No prices are quoted: check each provider's current pricing.

## Phase 1: Core (Done)
Accounts, profile, dashboard, PDF library and reader, notes, quizzes, planner, calculator, timer, voice (browser-based), glossary, admin console, RLS, storage policies, first-admin setup, account deletion, PWA shell.

## Phase 2: Launch hardening (Next)
- Native-speaker review of Tamil and Sinhala text; accessibility test with a screen reader on phone and desktop.
- Real content: verified PDFs with permissions, grade/subject mappings from official sources, first reviewed quizzes.
- Custom SMTP for auth emails; automated tests; error monitoring.
- Depends on: people, not code. Outside services: SMTP provider, optional error-monitoring service. Cost drivers: email volume.

## Phase 3: Content operations
Bulk upload with CSV, scheduled publish/unpublish, resource versioning, two-person approval, broken-link checker, content gap report, glossary translation review queue, server-side full-text search for Tamil and Sinhala.
Depends on: Phase 2 content volume. Outside services: none required (Postgres full-text). Cost drivers: database size.

## Phase 4: Practice depth
Question bank with tags, mock exam builder, printable papers (only permitted content), adaptive practice with an off switch, spaced repetition flashcards, private notebooks and reports expanded, server-side quiz grading for exam-style modes.
Depends on: reviewed question volume. Outside services: none required. Cost drivers: reviewer time.

## Phase 5: AI-assisted drafting (optional)
Edge Function that sends selected material to an AI provider and stores results as **draft, `origin = ai_generated`, unverified**; administrator review before publishing; every generated question cites its source material.
Depends on: Phase 4 review workflow, rate limits per administrator. Outside services: AI provider API (key kept as an Edge Function secret). Cost drivers: tokens, administrator review time. Never presented as official curriculum.

## Phase 6: OCR and cloud speech (optional)
OCR for scanned PDFs (machine-generated text, labelled as possibly inaccurate); cloud text-to-speech and speech-to-text for Tamil and Sinhala where browsers lack them. Must say clearly when text or audio is sent to a third party, ask permission before recording, and never store audio by default.
Depends on: provider support for Tamil and Sinhala quality. Outside services: OCR provider, speech provider. Cost drivers: per page / per character / per minute.

## Phase 7: Offline and low-bandwidth
Offline downloads of eligible public PDFs and notes with a visible sync status, study packs where usage rights allow, compressed PDF variants, USB/SD pack import for schools with no internet.
Depends on: usage-rights flags per resource (already stored), storage quotas on devices. Outside services: none required (service worker, IndexedDB). Cost drivers: bandwidth for pack downloads.

## Phase 8: Teachers and classes
Teacher verification, classes with join codes, assignments, announcements (no student chat), class-level progress views with minimum group sizes.
Depends on: new tables and RLS keyed by class membership; the `teacher` role already exists in `user_roles`. Outside services: none required. Cost drivers: support effort, privacy review.

## Phase 9: Family support and analytics
Guardian consent flow and read-only summaries, aggregated anonymised analytics for administrators, opt-in digests.
Depends on: legal review of children's data rules. Outside services: email/SMS if reminders are sent outside the app. Cost drivers: messages sent.

## Phase 10: Ongoing: pick from `FEATURE_IDEAS_1000.md`
Choose by student demand and available verified content. Each idea should pass the same gate: curriculum accuracy, copyright, privacy, accessibility, cost.
