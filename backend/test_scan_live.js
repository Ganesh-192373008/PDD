const jwt = require('jsonwebtoken');
const http = require('http');
const fs = require('fs');

const userId = '6a89f65d6d02ad16f6dd4c67';
const token = jwt.sign({ id: userId }, 'super_secret_agroassist_key_2026', { expiresIn: '1d' });

async function testScan() {
  console.log('Testing /api/disease/scan route...');
  const boundary = '----WebKitFormBoundaryXYZ987654321';
  const fileBytes = fs.readFileSync('test_image.png');

  const part1 = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="leaf_photo.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
  );
  const part2 = Buffer.from(`\r\n--${boundary}--\r\n`);
  const payload = Buffer.concat([part1, fileBytes, part2]);

  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/disease/scan',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': payload.length
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      try {
        console.log('RESPONSE:', JSON.stringify(JSON.parse(data), null, 2));
      } catch (e) {
        console.log('RAW RESPONSE:', data);
      }
      process.exit(res.statusCode === 200 ? 0 : 1);
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e);
    process.exit(1);
  });

  req.write(payload);
  req.end();
}

testScan();
