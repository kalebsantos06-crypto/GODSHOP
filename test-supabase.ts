import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('public_sales').select('*').limit(1);
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
