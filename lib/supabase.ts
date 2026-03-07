
/**
 * Supabase client setup.
 * Replace placeholders with your actual project URL and Anon Key.
 */
import { createClient } from '@supabase/supabase-js';

// Use direct access to import.meta.env for Vite to handle correctly
const env = (import.meta as any).env;
const supabaseUrl = env?.VITE_SUPABASE_URL;
const supabaseAnonKey = env?.VITE_SUPABASE_ANON_KEY || env?.VITE_SUPABASE_ANON;

// Strict check for valid credentials
export const isSupabaseConfigured = () => {
  return !!(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== 'your_supabase_project_url' && 
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseUrl.startsWith('https://')
  );
};

if (!isSupabaseConfigured()) {
  console.warn('Supabase credentials missing or invalid. Cloud sync is disabled. Using LocalStorage fallback.');
}

export const supabase = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'placeholder'
);

export const REALTIME_STREAMS = {
  MOVEMENTS: 'stock_movements',
  PRODUCTS: 'products',
};
