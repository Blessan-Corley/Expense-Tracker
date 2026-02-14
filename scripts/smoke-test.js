const http = require('http');

const url = process.argv[2] || 'http://localhost:5000/api/health';

console.log(`Checking health of ${url}...`);

const req = http.get(url, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Response:', JSON.stringify(json, null, 2));
      if (res.statusCode === 200 && json.status === 'healthy') {
        console.log('System is HEALTHY');
        process.exit(0);
      } else {
        console.error('System is UNHEALTHY');
        process.exit(1);
      }
    } catch (e) {
      console.error('Invalid JSON response', e.message);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`Connection failed: ${e.message}`);
  process.exit(1);
});

req.end();
