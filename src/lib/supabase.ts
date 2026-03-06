
import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env;
const supabaseUrl = env?.VITE_SUPABASE_URL;
const supabaseAnonKey = env?.VITE_SUPABASE_ANON_KEY;

// Strict check for valid credentials
const isValidConfig = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_project_url' && 
  supabaseUrl.startsWith('https://');

if (!isValidConfig) {
  console.warn('Supabase credentials missing or invalid. Using mock/localStorage fallback.');
}

export const supabase = createClient(
  isValidConfig ? supabaseUrl : 'https://placeholder.supabase.co',
  isValidConfig ? supabaseAnonKey : 'placeholder'
);
