import { exec } from 'child_process';
import fetch from 'node-fetch';

async function run() {
  const serverProcess = exec('node dist/server.cjs', { env: { ...process.env, NODE_ENV: 'production' } });
  serverProcess.stdout.pipe(process.stdout);
  serverProcess.stderr.pipe(process.stderr);
  
  // wait 2 seconds for server to start
  await new Promise(r => setTimeout(r, 2000));
  
  try {
    const res = await fetch('http://localhost:3000/assinar/ab47135d-a7c2-432b-8180-4ddf6e710328');
    console.log("Status:", res.status);
    console.log(await res.text());
  } catch (e) {
    console.log("Error:", e);
  }
  
  serverProcess.kill();
}
run();
