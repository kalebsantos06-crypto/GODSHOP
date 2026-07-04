import { supabase } from './src/lib/supabase.ts';
async function test() {
  const { data, error } = await supabase.from('public_sales').select('*').limit(1);
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
