import fetch from 'node-fetch';

async function run() {
  const res = await fetch('https://wkkjaakydjnfzayyedxy.supabase.co/invalid_url');
  console.log("Status:", res.status);
  console.log(await res.text());
}
run();
