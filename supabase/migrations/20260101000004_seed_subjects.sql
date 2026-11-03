-- =====================================================================
-- 4/4: The subject categories named by the owner. Names only: no curriculum facts are invented.
-- Grade / medium / pathway mappings are added later by an administrator.
-- =====================================================================

insert into public.subjects (slug, name_en, name_ta, name_si, sort_order, is_editable_slot) values
  ('tamil',       'Tamil',                    'தமிழ்',                                        'දෙමළ',                                    1, false),
  ('mathematics', 'Mathematics',              'கணிதம்',                                      'ගණිතය',                                   2, false),
  ('science',     'Science',                  'விஞ்ஞானம்',                                   'විද්‍යාව',                                 3, false),
  ('english',     'English',                  'ஆங்கிலம்',                                    'ඉංග්‍රීසි',                                4, false),
  ('geography',   'Geography',                'புவியியல்',                                   'භූගෝල විද්‍යාව',                           5, false),
  ('history',     'History',                  'வரலாறு',                                      'ඉතිහාසය',                                 6, false),
  ('health',      'Health',                   'சுகாதாரம்',                                   'සෞඛ්‍යය',                                  7, false),
  ('sinhala',     'Sinhala',                  'சிங்களம்',                                    'සිංහල',                                   8, false),
  ('aes',         'AES (Aesthetic Studies)',  'அழகியல் கல்வி (AES)',                        'සෞන්දර්ය අධ්‍යයනය (AES)',                  9, false),
  ('religion',    'Religion',                 'சமயம்',                                       'ආගම',                                     10, false),
  ('ict',         'ICT',                      'தகவல் தொடர்பாடல் தொழில்நுட்பம் (ICT)',       'තොරතුරු හා සන්නිවේදන තාක්ෂණය (ICT)',       11, false),
  ('pts',         'PTS',                      'PTS',                                          'PTS',                                      12, false),
  -- Slot 13: the owner did not name it. An administrator renames it in Admin > Subjects.
  ('other',       'Other subject',            'வேறு பாடம்',                                  'වෙනත් විෂයයක්',                            13, true)
on conflict (slug) do nothing;

insert into public.subjects (slug, parent_id, name_en, name_ta, name_si, sort_order)
select v.slug, (select id from public.subjects where slug = 'aes'), v.en, v.ta, v.si, v.ord
from (values
  ('aes-music', 'Music', 'சங்கீதம்',  'සංගීතය',  1),
  ('aes-dance', 'Dance', 'நடனம்',     'නැටුම',   2),
  ('aes-art',   'Art',   'சித்திரம்', 'චිත්‍ර',   3),
  ('aes-drama', 'Drama', 'நாடகம்',    'නාට්‍ය',  4)
) as v(slug, en, ta, si, ord)
on conflict (slug) do nothing;
