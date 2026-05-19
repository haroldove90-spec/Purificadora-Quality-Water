import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zzsbqrwmppvpvtajkuva.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6c2JxcndtcHB2cHZ0YWprdXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTQ2NjQsImV4cCI6MjA5NDczMDY2NH0.VQyx8HLHn8kjVX9rgY2xoPejBKGffWTQaTolXiToAjE';

const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL || SUPABASE_URL;
const supabaseUrl = rawUrl.trim().replace(/\/+$/, '').split('/rest/v1')[0];

const supabaseAnonKey = ((import.meta as any).env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY).trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase credentials missing!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
