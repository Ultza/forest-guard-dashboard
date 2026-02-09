import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Sempurnakan konfigurasi untuk mendukung Realtime & Auth Persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  auth: {
    persistSession: true, // Menjaga user tetap login meskipun halaman di-refresh
    autoRefreshToken: true,
  }
});

/**
 * Fungsi pembantu (helper) untuk mengambil data profil 
 * agar tidak perlu menulis query panjang berulang-ulang di page.tsx
 */
export const getUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) return null;
  return profile;
};