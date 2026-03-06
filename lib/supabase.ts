
/**
 * Supabase client setup.
 * Replace placeholders with your actual project URL and Anon Key.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const REALTIME_STREAMS = {
  MOVEMENTS: 'stock_movements',
  PRODUCTS: 'products',
};
