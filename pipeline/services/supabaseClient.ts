import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Persistence will be disabled.');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      from: () => ({
        select: async () => ({ data: null, error: { message: 'Supabase credentials missing' } }),
        upsert: async () => ({ data: null, error: { message: 'Supabase credentials missing' } }),
        insert: async () => ({ data: null, error: { message: 'Supabase credentials missing' } }),
        update: async () => ({ data: null, error: { message: 'Supabase credentials missing' } }),
        delete: async () => ({ data: null, error: { message: 'Supabase credentials missing' } }),
      }),
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ error: { message: 'Supabase credentials missing' } }),
        signUp: async () => ({ error: { message: 'Supabase credentials missing' } }),
        signOut: async () => {},
      }
    } as any;
