const fs = require('fs');
const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

if (!fs.existsSync('message.txt') || !fs.existsSync('target.txt') || !fs.existsSync('storageState.json')) {
  console.error('[FATAL] message.txt, target.txt or storageState.json missing!');
  process.exit(1);
}

const message = fs.readFileSync('message.txt', 'utf8').trim();
const targets = fs.readFileSync('target.txt', 'utf8').split('\n').map(l => l.trim()).filter(Boolean);

(async () => {
  console.log('[BOT] Launching browser...');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ storageState: 'storageState.json' });
  const page = await context.newPage();

  for (const uid of targets) {
    try {
      console.log(`[BOT] Sending to ${uid}...`);
      await page.goto(`https://www.facebook.com/messages/e2ee/t/${uid}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);
      await page.keyboard.type(message);
      await page.keyboard.press('Enter');
      console.log(`[OK] Sent to ${uid}`);
      await page.waitForTimeout(3000);
    } catch (err) {
      console.error(`[ERR] Failed for ${uid}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('[✅] Done sending all messages.');
})();

app.get('/', (_, res) => res.send('✅ Facebook E2EE bot is running'));
app.listen(PORT, () => console.log(`[SERVER] Running on port ${PORT}`));
