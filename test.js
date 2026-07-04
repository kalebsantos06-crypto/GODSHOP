const http = require('http');
http.get('http://localhost:3000/api/dailyTip', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Response:', data.substring(0, 100)));
}).on('error', (err) => console.log('Error:', err.message));
