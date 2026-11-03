import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True only when real public Supabase settings were provided. */
export const isConfigured = Boolean(url && key && /^https?:\/\//.test(url));
export const supabaseUrl = isConfigured ? (url as string) : 'http://localhost:54321';
export const supabaseAnonKey = isConfigured ? (key as string) : 'not-configured';

// Only the public URL and anon key are used here. Security comes from Row Level Security in the database.
export const supabase = createClient(supabaseUrl, isConfigured ? (key as string) : 'not-configured', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
