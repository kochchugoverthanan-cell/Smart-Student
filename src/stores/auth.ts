import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';
import { useSettings } from './settings';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  mustChangePassword: boolean;
  recovery: boolean;
  loading: boolean;
  init: () => () => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<string | null>;
  signOut: () => Promise<void>;
}

async function loadAccess(user: User | null) {
  if (!user) return { profile: null, isAdmin: false, mustChange: false };
  const [p, r] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', user.id),
  ]);
  const profile = (p.data ?? null) as Profile | null;
  const roles = ((r.data ?? []) as { role: string }[]).map((x) => x.role);
  const mustChange = Boolean(profile?.must_change_password);
  // The database enforces the same rule: is_admin() is false until the temporary password is changed.
  return { profile, isAdmin: roles.includes('admin') && !mustChange, mustChange };
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isAdmin: false,
  mustChangePassword: false,
  recovery: false,
  loading: true,

  init: () => {
    const apply = async (session: Session | null) => {
      const user = session?.user ?? null;
      const a = await loadAccess(user);
      if (a.profile) {
        useSettings.setState({ language: a.profile.language, textSize: a.profile.text_size, lowData: a.profile.low_data });
      }
      set({ user, profile: a.profile, isAdmin: a.isAdmin, mustChangePassword: a.mustChange, loading: false });
    };
    supabase.auth.getSession().then(({ data }) => { void apply(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') set({ recovery: true });
      // Do not call Supabase directly inside this callback; defer it.
      setTimeout(() => { void apply(session); }, 0);
    });
    return () => sub.subscription.unsubscribe();
  },

  refreshProfile: async () => {
    const a = await loadAccess(get().user);
    set({ profile: a.profile, isAdmin: a.isAdmin, mustChangePassword: a.mustChange });
  },

  updateProfile: async (patch) => {
    const user = get().user;
    if (!user) return 'Not signed in';
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
    if (error) return error.message;
    const cur = get().profile;
    if (cur) set({ profile: { ...cur, ...patch } });
    return null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, isAdmin: false, mustChangePassword: false, recovery: false });
  },
}));
