// The 60 optional modules from the project brief. A module is "available" only when it really works in this build.
export const MODULES: string[] = [
  'Grade-specific syllabus map', 'Lesson checklist (not started / studying / reviewed)', 'Searchable subject glossary',
  'Bilingual glossary (verified translations)', 'Formula reference', 'Interactive periodic table',
  'Mathematics practice generator', 'Spelling practice', 'Reading comprehension practice', 'Vocabulary practice and revision',
  'Pronunciation practice', 'Essay planner', 'Writing suggestions (not official marks)', 'Printable handwriting worksheets',
  'Dictation practice', 'Concept map builder', 'Mind map maker', 'Diagram labelling practice', 'Safe Science activity collection',
  'Geography map practice', 'History timeline', 'Private AES portfolio', 'ICT typing practice', 'PTS project planner',
  'Question of the day', 'Question bank filters', 'Adaptive practice (can be turned off)', 'Mock exam builder',
  'Printable practice papers', 'Timed answer-writing practice', 'Self-marking guide with verified answer keys',
  'Private notebook of incorrectly answered questions', 'Revision calendar', 'Countdown widgets',
  'Private grade and subject progress reports', 'Links from questions to related resources', 'Study calendar',
  'Private study-session log', 'Weekly study-goal tracker', 'Private study streaks', 'Private folders',
  'PDF highlights and annotations', 'Note templates', 'Export my notes', 'Backup and restore', 'Recently opened history with clear control',
  'Continue reading from the last page', 'Learning preferences', 'Resource recommendations', 'Administrator resource collections',
  'Low-data mode', 'Installable app (PWA)', 'Offline access to public resources', 'Downloadable study packs',
  'Audio playlist for notes', 'Captions and transcripts', 'Teacher assignments', 'Class announcements',
  'Resource request form', 'Content feedback form',
];
// 1-based numbers of the modules that are working in this build.
export const AVAILABLE_MODULES = new Set([3, 4, 26, 32, 34, 35, 38, 44, 46, 47, 48, 51, 52, 59, 60]);
