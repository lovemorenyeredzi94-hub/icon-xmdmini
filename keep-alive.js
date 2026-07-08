// keep-alive.js - External pinger that runs separately
const fetch = require('node-fetch');

const url = process.env.RENDER_EXTERNAL_URL || 'https://your-app-name.onrender.com';

console.log('🔄 Keep-alive service started');
console.log(`📍 Will ping: ${url}/ping`);

// Ping every 4 minutes (240,000 ms)
setInterval(() => {
  fetch(`${url}/ping`)
    .then(res => {
      if (res.ok) {
        console.log(`✅ Keep-alive ping at ${new Date().toISOString()}`);
      }
    })
    .catch(err => {
      console.log(`⚠️ Keep-alive ping failed: ${err.message}`);
    });
}, 4 * 60 * 1000); // 4 minutes

// Also ping once at startup
setTimeout(() => {
  fetch(`${url}/ping`).catch(() => {});
}, 3000);
