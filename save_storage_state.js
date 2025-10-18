const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  if (!fs.existsSync('cookies.json')) {
    console.error('[❌] cookies.json not found!');
    process.exit(1);
  }

  const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext();
  await context.addCookies(cookies);

  const page = await context.newPage();
  await page.goto('https://www.facebook.com/messages', { waitUntil: 'domcontentloaded' });

  await context.storageState({ path: 'storageState.json' });
  console.log('[✅] storageState.json created successfully from cookies.');
  await browser.close();
})();
