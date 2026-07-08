const express = require('express');
const app = express();
__path = process.cwd()
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
let code = require('./pair');
const fetch = require('node-fetch'); // ✅ Already installed

require('events').EventEmitter.defaultMaxListeners = 500;

// ========== SELF-PING FUNCTION (Every 3 Minutes) ==========
function startSelfPing() {
  // Use Render's external URL or localhost
  const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  
  console.log(`🔄 Self-ping will run every 3 minutes to keep bot awake`);
  console.log(`📍 Pinging: ${url}/ping`);
  
  // Ping EVERY 3 MINUTES (180,000 ms) - Safe for 5-min sleep limit
  setInterval(() => {
    fetch(`${url}/ping`)
      .then(res => {
        if (res.ok) {
          console.log(`✅ Self-ping successful at ${new Date().toLocaleTimeString()}`);
        }
      })
      .catch(() => {
        // Silently handle - bot might be waking up
      });
  }, 3 * 60 * 1000); // 3 minutes

  // Extra safety ping at 2 minutes
  setInterval(() => {
    fetch(`${url}/ping`).catch(() => {});
  }, 2 * 60 * 1000); // 2 minutes backup
}

// ========== PING ENDPOINT ==========
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// ========== EXISTING ROUTES ==========
app.use('/code', code);
app.use('/pair', async (req, res, next) => {
    res.sendFile(__path + '/pair.html');
});
app.use('/', async (req, res, next) => {
    res.sendFile(__path + '/main.html');
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ========== START SERVER ==========
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
Don't Forget To Give Star ‼️

Astra

Server running on http://0.0.0.0:` + PORT);
    
    // Start self-ping after server is running
    startSelfPing();
});

module.exports = app;
