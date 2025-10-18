const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  // Load cookies.json
  if (!fs.existsSync('cookies.json')) {
    console.error('[❌] cookies.json not found! Create it first.');
    process.exit(1);
  }

  const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));

  // Launch headless browser
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext();

  // Add cookies to context
  await context.addCookies(cookies);

  // Open Facebook to initialize session
  const page = await context.newPage();
  await page.goto('https://www.facebook.com/messages', { waitUntil: 'domcontentloaded' });

  // Save storageState.json
  await context.storageState({ path: 'storageState.json' });
  console.log('[✅] storageState.json created successfully from cookies.');

  await browser.close();
})();
