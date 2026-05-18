import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl
  .trim()
  .replace(/\/+$/, '') // Elimina todos los slashes finales
  .replace(/\/rest\/v1\/?$/, ''); // Elimina sufijo /rest/v1 o /rest/v1/ de forma segura

const supabaseAnonKey = ((import.meta as any).env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Check your .env file.');
} else {
  console.log('[Supabase] Initializing with:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
