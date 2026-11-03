import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/ui';
import { useT } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { useAuth } from '../stores/auth';

export default function Privacy() {
  const t = useT();
  const nav = useNavigate();
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);

  async function deleteAccount() {
    setBusy(true);
    const { error } = await supabase.functions.invoke('delete-account', { body: { confirm: 'DELETE' } });
    if (error) {
      let msg = error.message;
      try { const b = await (error as unknown as { context: Response }).context.json(); if (b?.error) msg = b.error; } catch { /* keep */ }
      setBusy(false); return toast.error(msg);
    }
    await signOut(); toast.success(t('accountDeleted')); nav('/', { replace: true });
  }
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={t('privacy')} />
      <section className="card space-y-2">
        <p>{t('privacyIntro')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('privacyCollect')}</li>
          <li>{t('privacyNoPublic')}</li>
          <li>{t('privacyVoice')}</li>
          <li>{t('privacyOptional')}</li>
        </ul>
      </section>
      {user && (
        <section className="card space-y-3 border-red-200" aria-labelledby="del">
          <h2 id="del" className="text-lg font-bold text-red-900">{t('deleteAccount')}</h2>
          <p>{t('deleteExplain')}</p>
          <label className="block"><span className="label">{t('typeDelete')}</span><input className="input sm:max-w-xs" value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" /></label>
          <button type="button" className="btn btn-danger" disabled={word !== 'DELETE' || busy} onClick={() => void deleteAccount()}>{t('deleteAccount')}</button>
        </section>
      )}
    </div>
  );
}
