import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/dailyTip');
    console.log(res.status, res.headers.get('content-type'));
    const text = await res.text();
    console.log('Response body:', text.substring(0, 100));
  } catch (e) {
    console.log('Error:', e);
  }
}
test();
