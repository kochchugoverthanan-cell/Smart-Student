import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Square, Volume2 } from 'lucide-react';
import { LANGUAGES, langEnglishName } from '../lib/constants';
import { useSettings } from '../stores/settings';
import { useT } from '../lib/i18n';
import type { Lang } from '../lib/types';

/** Text-to-speech using the voices installed in this browser/device. Nothing is sent to any server by this site. */
export default function ReadAloud({ text, lang = 'en', showLanguage = false }: { text: string; lang?: Lang; showLanguage?: boolean }) {
  const t = useT();
  const uiLang = useSettings((s) => s.language);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [code, setCode] = useState<Lang>(lang);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState('');
  const [rate, setRate] = useState(1);
  const [state, setState] = useState<'idle' | 'speaking' | 'paused'>('idle');
  const run = useRef(0);

  useEffect(() => { setCode(lang); }, [lang]);
  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      run.current += 1;
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const match = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(code));
  useEffect(() => { setVoiceURI(match[0]?.voiceURI ?? ''); }, [code, voices.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function play() {
    const synth = window.speechSynthesis;
    run.current += 1;
    const id = run.current;
    synth.cancel();
    const voice = match.find((v) => v.voiceURI === voiceURI) ?? match[0];
    const chunks = (text.match(/[^.!?।\n]+[.!?।]?/g) ?? []).map((s) => s.trim()).filter(Boolean);
    if (!voice || chunks.length === 0) return;
    chunks.forEach((c, i) => {
      const u = new SpeechSynthesisUtterance(c);
      u.voice = voice; u.lang = voice.lang; u.rate = rate;
      if (i === chunks.length - 1) {
        u.onend = () => { if (run.current === id) setState('idle'); };
        u.onerror = () => { if (run.current === id) setState('idle'); };
      }
      synth.speak(u);
    });
    setState('speaking');
  }
  function pause() { window.speechSynthesis.pause(); setState('paused'); }
  function resume() { window.speechSynthesis.resume(); setState('speaking'); }
  function stop() { run.current += 1; window.speechSynthesis.cancel(); setState('idle'); }

  if (!supported) return <p className="text-sm text-slate-700">{t('ttsUnsupported')}</p>;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-end gap-3">
        {showLanguage && (
          <label className="block">
            <span className="label">{t('language')}</span>
            <select className="input" value={code} onChange={(e) => { stop(); setCode(e.target.value as Lang); }}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </label>
        )}
        {match.length > 0 && (
          <>
            <label className="block">
              <span className="label">{t('voiceLabel')}</span>
              <select className="input" value={voiceURI} onChange={(e) => setVoiceURI(e.target.value)}>
                {match.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">{t('speed')}: {rate.toFixed(1)}x</span>
              <input type="range" min={0.5} max={1.5} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="mt-3 w-40" />
            </label>
            <div className="flex gap-2">
              {state === 'idle' && <button type="button" className="btn btn-primary" onClick={play} disabled={!text.trim()}><Volume2 className="h-5 w-5" aria-hidden="true" />{t('readAloud')}</button>}
              {state === 'speaking' && <button type="button" className="btn btn-secondary" onClick={pause}><Pause className="h-5 w-5" aria-hidden="true" />{t('pause')}</button>}
              {state === 'paused' && <button type="button" className="btn btn-secondary" onClick={resume}><Play className="h-5 w-5" aria-hidden="true" />{t('resume')}</button>}
              {state !== 'idle' && <button type="button" className="btn btn-secondary" onClick={stop}><Square className="h-5 w-5" aria-hidden="true" />{t('stop')}</button>}
            </div>
          </>
        )}
      </div>
      {match.length === 0 && (
        <p role="status" className="mt-2 text-sm text-amber-900">{t('noVoice', { lang: uiLang === 'en' ? langEnglishName(code) : (LANGUAGES.find((l) => l.code === code)?.label ?? code) })}</p>
      )}
    </div>
  );
}
