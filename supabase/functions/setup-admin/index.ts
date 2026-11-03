// One-time creation of the first administrator.
//
// Secrets (set with `supabase secrets set`, never in the website code):
//   INITIAL_ADMIN_EMAIL     the administrator's email
//   INITIAL_ADMIN_PASSWORD  the temporary password (forced change at first sign-in)
//   SETUP_TOKEN             a long random string that proves you are the owner
// Supabase supplies SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY automatically.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-setup-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const email = Deno.env.get('INITIAL_ADMIN_EMAIL');
  const password = Deno.env.get('INITIAL_ADMIN_PASSWORD');
  const token = Deno.env.get('SETUP_TOKEN');
  if (!email || !password || !token) return json({ error: 'Setup secrets are not configured on the server.' }, 503);

  const sent = req.headers.get('x-setup-token') ?? '';
  if (!safeEqual(sent, token)) return json({ error: 'Invalid setup token.' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const { data: setup } = await admin.from('app_setup').select('admin_setup_done').eq('id', 1).maybeSingle();
  if (setup?.admin_setup_done) return json({ error: 'Setup has already been completed. This cannot be run again.' }, 409);
  const { data: existing } = await admin.from('user_roles').select('user_id').eq('role', 'admin').limit(1);
  if (existing && existing.length > 0) return json({ error: 'An administrator already exists.' }, 409);

  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: 'Administrator' } });
  if (created.error || !created.data.user) return json({ error: created.error?.message ?? 'Could not create the user.' }, 400);
  const uid = created.data.user.id;

  try {
    const p = await admin.from('profiles').update({ must_change_password: true }).eq('id', uid);
    if (p.error) throw new Error(p.error.message);
    const r = await admin.from('user_roles').insert({ user_id: uid, role: 'admin' });
    if (r.error) throw new Error(r.error.message);
    const h = await admin.rpc('record_initial_password_hash', { p_user: uid });
    if (h.error) throw new Error(h.error.message);
    const s = await admin.from('app_setup').update({ admin_setup_done: true, completed_at: new Date().toISOString() }).eq('id', 1);
    if (s.error) throw new Error(s.error.message);
  } catch (e) {
    await admin.auth.admin.deleteUser(uid); // undo, so setup can be retried cleanly
    return json({ error: `Setup failed and was rolled back: ${e instanceof Error ? e.message : String(e)}` }, 500);
  }
  return json({ ok: true, message: 'Administrator created. Sign in now and choose a new password. Then remove the three setup secrets.' });
});
