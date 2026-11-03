import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lang, TextSize } from '../lib/types';

interface SettingsState {
  language: Lang;
  textSize: TextSize;
  lowData: boolean;
  setLanguage: (l: Lang) => void;
  setTextSize: (s: TextSize) => void;
  setLowData: (v: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'en',
      textSize: 'medium',
      lowData: false,
      setLanguage: (language) => set({ language }),
      setTextSize: (textSize) => set({ textSize }),
      setLowData: (lowData) => set({ lowData }),
    }),
    { name: 'ssl-settings' }
  )
);

export function applySettings(s: { language: Lang; textSize: TextSize; lowData: boolean }) {
  const el = document.documentElement;
  el.lang = s.language;
  el.dataset.textSize = s.textSize;
  el.dataset.lowData = String(s.lowData);
}
