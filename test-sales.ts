import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/public-sales/ab47135d-a7c2-432b-8180-4ddf6e710328');
    console.log(res.status);
    const text = await res.text();
    console.log('Response body:', text);
  } catch (e) {
    console.log('Error:', e);
  }
}
test();
