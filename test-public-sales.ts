import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
if (supabaseUrl.endsWith('/rest/v1/')) {
  supabaseUrl = supabaseUrl.slice(0, -9);
} else if (supabaseUrl.endsWith('/rest/v1')) {
  supabaseUrl = supabaseUrl.slice(0, -8);
}
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing supabase keys in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('public_sales').select('*');
  if (error) {
    console.error(error);
  } else {
    data?.forEach(d => {
       console.log(`ID: ${d.id}, signature_data length: ${d.signature_data?.length || 0}, signed_at: ${d.signed_at}, sale_data signatureInfo: ${!!d.sale_data?.signatureInfo}`);
    });
  }
}

run();
