import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl
  .trim()
  .replace(/\/+$/, '') // Quita diagonales finales
  .split('/rest/v1')[0]; // Se asegura de que no lleve el sufijo de la API

const supabaseAnonKey = ((import.meta as any).env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase credentials missing!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
