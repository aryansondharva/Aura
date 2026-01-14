import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

// Validate required environment variables
if (!config.supabaseUrl) {
  throw new Error('SUPABASE_URL is required');
}

if (!config.supabaseKey) {
  throw new Error('SUPABASE_KEY is required');
}

// Initialize Supabase client with URL and key from config
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

export default supabase;
