import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Field, PageHeader } from '../components/ui';
import { GRADES, LANGUAGES, MEDIUMS } from '../lib/constants';
import { useT } from '../lib/i18n';
import type { Lang, Medium, TextSize } from '../lib/types';
import { useAuth } from '../stores/auth';
import { subjectName, useCatalog } from '../stores/catalog';
import { useSettings } from '../stores/settings';

const SIZES: TextSize[] = ['small', 'medium', 'large', 'xlarge'];

export default function Profile() {
  const t = useT();
  const profile = useAuth((s) => s.profile);
  const updateProfile = useAuth((s) => s.updateProfile);
  const subjects = useCatalog((s) => s.subjects);
  const mappings = useCatalog((s) => s.grades);
  const lang = useSettings((s) => s.language);
  const [f, setF] = useState({ name: '', grade: '', medium: '', language: 'en' as Lang, textSize: 'medium' as TextSize, lowData: false, reminders: false, track: true, subjects: [] as string[] });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setF({
      name: profile.display_name ?? '', grade: profile.grade ? String(profile.grade) : '', medium: profile.medium ?? '',
      language: profile.language, textSize: profile.text_size, lowData: profile.low_data, reminders: profile.reminders,
      track: profile.track_activity, subjects: profile.subject_ids ?? [],
    });
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const grade = Number(f.grade) || null;
  // A subject is offered when no grade mapping exists for it yet, or when it is mapped to the chosen grade.
  const visible = subjects.filter((s) => s.parent_id === null && s.is_active && (!grade || !mappings.some((m) => m.subject_id === s.id) || mappings.some((m) => m.subject_id === s.id && m.grade === grade)));
  const toggle = (id: string) => setF((p) => ({ ...p, subjects: p.subjects.includes(id) ? p.subjects.filter((x) => x !== id) : [...p.subjects, id] }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const err = await updateProfile({
      display_name: f.name.trim() || null, grade, medium: (f.medium || null) as Medium | null, language: f.language,
      text_size: f.textSize, low_data: f.lowData, reminders: f.reminders, track_activity: f.track, subject_ids: f.subjects,
    });
    setBusy(false);
    if (err) return toast.error(`${t('errorGeneric')} ${err}`);
    useSettings.setState({ language: f.language, textSize: f.textSize, lowData: f.lowData });
    toast.success(t('saved'));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('profile')} />
      <form onSubmit={submit} className="space-y-6">
        <section className="card space-y-4">
          <Field label={t('displayName')} hint={t('optional')}><input className="input" value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('grade')}>
              <select className="input" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })}>
                <option value="">{t('select')}</option>
                {GRADES.map((g) => <option key={g} value={g}>{t('grade')} {g}</option>)}
              </select>
            </Field>
            <Field label={t('medium')}>
              <select className="input" value={f.medium} onChange={(e) => setF({ ...f, medium: e.target.value })}>
                <option value="">{t('select')}</option>
                {MEDIUMS.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label={t('language')}>
            <select className="input" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value as Lang })}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>
          <Field label={t('textSize')}>
            <select className="input" value={f.textSize} onChange={(e) => setF({ ...f, textSize: e.target.value as TextSize })}>
              {SIZES.map((s) => <option key={s} value={s}>{t('size_' + s)}</option>)}
            </select>
          </Field>
        </section>

        <fieldset className="card">
          <legend className="px-1 text-lg font-bold">{t('subjects')}</legend>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {visible.map((s) => (
              <li key={s.id}>
                <label className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-3 ${f.subjects.includes(s.id) ? 'border-primary-700 bg-primary-50' : 'border-slate-300'}`}>
                  <input type="checkbox" className="h-5 w-5" checked={f.subjects.includes(s.id)} onChange={() => toggle(s.id)} />
                  <span>{subjectName(s, lang)}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <section className="card space-y-3">
          <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1.5 h-5 w-5" checked={f.lowData} onChange={(e) => setF({ ...f, lowData: e.target.checked })} /><span><span className="block font-semibold">{t('lowData')}</span><span className="text-sm text-slate-700">{t('lowDataHelp')}</span></span></label>
          <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1.5 h-5 w-5" checked={f.reminders} onChange={(e) => setF({ ...f, reminders: e.target.checked })} /><span><span className="block font-semibold">{t('remindersLabel')}</span><span className="text-sm text-slate-700">{t('remindersHelp')}</span></span></label>
          <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1.5 h-5 w-5" checked={f.track} onChange={(e) => setF({ ...f, track: e.target.checked })} /><span><span className="block font-semibold">{t('trackLabel')}</span><span className="text-sm text-slate-700">{t('trackHelp')}</span></span></label>
        </section>
        <button className="btn btn-primary" disabled={busy}>{busy ? t('loading') : t('save')}</button>
      </form>
    </div>
  );
}
