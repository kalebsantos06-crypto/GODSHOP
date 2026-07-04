import fetch from 'node-fetch';

async function test() {
  const res = await fetch('http://localhost:3000/assinar/ab47135d-a7c2-432b-8180-4ddf6e710328');
  console.log(res.status);
  console.log(await res.text());
}
test();
