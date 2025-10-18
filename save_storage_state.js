// save_storage_state.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Launching headed browser. Please log in to Facebook in the opened window.');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto('https://www.facebook.com/');
  console.log('\n> Log in to Facebook in the opened browser window.');
  console.log('> OPTIONAL: Open the secret conversation(s) you want the bot to access (https://www.facebook.com/messages/e2ee/t/{UID}).');
  console.log('When ready, return to this terminal and press ENTER to save storageState.json');

  process.stdin.setEncoding('utf8');
  process.stdin.once('data', async () => {
    const outPath = path.resolve(__dirname, 'storageState.json');
    await context.storageState({ path: outPath });
    console.log(`Saved storageState.json to: ${outPath}`);
    await browser.close();
    process.exit(0);
  });
})();
