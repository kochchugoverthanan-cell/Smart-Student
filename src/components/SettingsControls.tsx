import { Settings } from 'lucide-react';
import { LANGUAGES } from '../lib/constants';
import { useT } from '../lib/i18n';
import type { Lang, TextSize } from '../lib/types';
import { useAuth } from '../stores/auth';
import { useSettings } from '../stores/settings';

/** Changes the setting on this device and, when signed in, saves it to the student's profile. */
export function useSettingActions() {
  const user = useAuth((s) => s.user);
  const updateProfile = useAuth((s) => s.updateProfile);
  const st = useSettings();
  return {
    setLanguage: (l: Lang) => { st.setLanguage(l); if (user) void updateProfile({ language: l }); },
    setTextSize: (s: TextSize) => { st.setTextSize(s); if (user) void updateProfile({ text_size: s }); },
    setLowData: (v: boolean) => { st.setLowData(v); if (user) void updateProfile({ low_data: v }); },
  };
}

export function LanguageSwitcher() {
  const t = useT();
  const language = useSettings((s) => s.language);
  const { setLanguage } = useSettingActions();
  return (
    <div role="group" aria-label={t('language')} className="flex overflow-hidden rounded-lg border border-slate-300 bg-white">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          aria-pressed={language === l.code}
          onClick={() => setLanguage(l.code)}
          className={`min-h-[44px] px-3 text-sm font-semibold ${language === l.code ? 'bg-primary-700 text-white' : 'hover:bg-slate-100'}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

const SIZES: TextSize[] = ['small', 'medium', 'large', 'xlarge'];

export function DisplayMenu() {
  const t = useT();
  const textSize = useSettings((s) => s.textSize);
  const lowData = useSettings((s) => s.lowData);
  const { setTextSize, setLowData } = useSettingActions();
  return (
    <details className="relative">
      <summary className="btn btn-secondary cursor-pointer list-none" aria-label={t('display')}>
        <Settings className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">{t('display')}</span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
        <fieldset>
          <legend className="label mb-2">{t('textSize')}</legend>
          <div className="grid grid-cols-2 gap-2">
            {SIZES.map((s) => (
              <label key={s} className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-3 ${textSize === s ? 'border-primary-700 bg-primary-50' : 'border-slate-300'}`}>
                <input type="radio" name="text-size" checked={textSize === s} onChange={() => setTextSize(s)} />
                <span>{t('size_' + s)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1.5 h-5 w-5" checked={lowData} onChange={(e) => setLowData(e.target.checked)} />
          <span>
            <span className="block font-semibold">{t('lowData')}</span>
            <span className="block text-sm text-slate-600">{t('lowDataHelp')}</span>
          </span>
        </label>
      </div>
    </details>
  );
}
