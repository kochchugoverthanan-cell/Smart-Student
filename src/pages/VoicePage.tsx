import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import ReadAloud from '../components/ReadAloud';
import { Field, PageHeader } from '../components/ui';
import { LANGUAGES } from '../lib/constants';
import { useT } from '../lib/i18n';
import type { Lang } from '../lib/types';
import { useSettings } from '../stores/settings';

export default function VoicePage() {
  const t = useT();
  const uiLang = useSettings((s) => s.language);
  const [text, setText] = useState('');
  const [lang, setLang] = useState<Lang>(uiLang);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t('voice')} subtitle={t('voiceHelp')} />
      <section className="card space-y-3" aria-labelledby="v-text">
        <h2 id="v-text" className="text-lg font-bold">{t('textToRead')}</h2>
        <Field label={t('language')}>
          <select className="input sm:max-w-xs" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>{LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select>
        </Field>
        <textarea className="input" rows={6} lang={lang} value={text} onChange={(e) => setText(e.target.value)} aria-label={t('textToRead')} />
        <ReadAloud text={text} lang={lang} />
      </section>
      <Dictation lang={lang} onText={(s) => setText((p) => (p ? `${p} ${s}` : s))} />
    </div>
  );
}

function Dictation({ lang, onText }: { lang: Lang; onText: (s: string) => void }) {
  const t = useT();
  const SR = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
  const rec = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [listening, setListening] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [interim, setInterim] = useState('');
  useEffect(() => () => { rec.current?.abort?.(); }, []);

  if (!SR) return <section className="card"><h2 className="text-lg font-bold">{t('dictation')}</h2><p className="mt-2 text-slate-700">{t('sttUnsupported')}</p></section>;

  function start() {
    setMsg(null); setInterim('');
    const r = new SR();
    r.lang = LANGUAGES.find((l) => l.code === lang)?.stt ?? 'en-US';
    r.interimResults = true; r.continuous = true;
    r.onresult = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      let tmp = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) onText(String(res[0].transcript).trim()); else tmp += res[0].transcript;
      }
      setInterim(tmp);
    };
    r.onerror = (e: { error?: string }) => {
      setListening(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setMsg(t('micDenied'));
      else if (e.error === 'language-not-supported') setMsg(t('langUnsupported'));
      else if (e.error === 'no-speech') setMsg(t('noSpeech'));
      else setMsg(t('errorGeneric'));
    };
    r.onend = () => { setListening(false); setInterim(''); };
    rec.current = r;
    try { r.start(); setListening(true); } catch { setMsg(t('errorGeneric')); }
  }
  function stop() { rec.current?.stop?.(); }

  return (
    <section className="card space-y-3" aria-labelledby="v-dict">
      <h2 id="v-dict" className="text-lg font-bold">{t('dictation')}</h2>
      <p className="rounded-lg bg-slate-100 p-3 text-sm">{t('micPermission')}</p>
      <div className="flex flex-wrap items-center gap-3">
        {!listening
          ? <button type="button" className="btn btn-primary" onClick={start}><Mic className="h-5 w-5" aria-hidden="true" />{t('startListening')}</button>
          : <button type="button" className="btn btn-danger" onClick={stop}><MicOff className="h-5 w-5" aria-hidden="true" />{t('stopListening')}</button>}
        {listening && <span role="status" className="font-semibold text-red-800">● {t('listening')}</span>}
      </div>
      {interim && <p className="text-slate-600" aria-live="polite">{interim}</p>}
      {msg && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-amber-900">{msg}</p>}
    </section>
  );
}
