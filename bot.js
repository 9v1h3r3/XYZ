const fs = require('fs');
const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

// Delays (ms)
const MIN_DELAY_MS = parseInt(process.env.MIN_DELAY_MS || '5000');
const MAX_DELAY_MS = parseInt(process.env.MAX_DELAY_MS || '10000');
const CYCLE_WAIT_MS = parseInt(process.env.CYCLE_WAIT_MS || '120000');

// Load external files
const message = fs.existsSync('message.txt') ? fs.readFileSync('message.txt', 'utf8').trim() : '';
const targets = fs.existsSync('target.txt') ? fs.readFileSync('target.txt', 'utf8').trim().split(/\r?\n/) : [];
const storageStateExists = fs.existsSync('storageState.json');

if (!message || !targets.length || !storageStateExists) {
  console.error('[FATAL] message.txt, target.txt or storageState.json missing!');
  process.exit(1);
}

function randomDelay() {
  return Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
}

// Express status route
app.get('/', (req, res) => res.send('✅ E2EE Messenger bot running!'));

// Main bot function
async function sendMessages() {
  console.log('[+] Launching browser...');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ storageState: 'storageState.json' });
  const page = await context.newPage();

  for (const uid of targets) {
    const e2eeLink = `https://www.facebook.com/messages/e2ee/t/${uid}`;
    try {
      console.log(`[>] Opening chat: ${e2eeLink}`);
      await page.goto(e2eeLink, { waitUntil: 'domcontentloaded', timeout: 60000 });

      await page.waitForSelector('[contenteditable="true"]', { timeout: 15000 });
      await page.type('[contenteditable="true"]', message, { delay: 50 });
      await page.keyboard.press('Enter');

      console.log(`[✅] Sent to ${uid}`);
      await new Promise(r => setTimeout(r, randomDelay()));
    } catch (err) {
      console.error(`[❌] Failed to send to ${uid}: ${err.message}`);
    }
  }

  await browser.close();
  console.log(`[🕒] Cycle complete. Waiting ${CYCLE_WAIT_MS / 1000}s...`);
  setTimeout(sendMessages, CYCLE_WAIT_MS);
}

// Start bot loop
sendMessages().catch(err => console.error('Bot crashed:', err));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
