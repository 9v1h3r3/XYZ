/**
 * e2ee-secret-bot-autonomous.js
 * Fully autonomous E2EE Secret Messenger bot (Render-ready)
 *
 * Requirements:
 *  - Node 18+
 *  - npm install (playwright, node-fetch)
 *
 * Place `storageState.json`, `target.txt`, `message.txt` in repo root (but do not commit storageState.json publicly).
 *
 * Optional env vars:
 *  - MIN_DELAY_MS (default 3000)
 *  - MAX_DELAY_MS (default 7000)
 *  - CYCLE_WAIT_MS (default 90000)
 *  - ALERT_WEBHOOK (optional, Slack/Telegram webhook URL)
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname);
const STORAGE_FILE = path.join(ROOT, 'storageState.json'); // recommended
const TARGET_FILE = path.join(ROOT, 'target.txt');
const MESSAGE_FILE = path.join(ROOT, 'message.txt');

const MIN_DELAY_MS = parseInt(process.env.MIN_DELAY_MS || '3000', 10);
const MAX_DELAY_MS = parseInt(process.env.MAX_DELAY_MS || '7000', 10);
const CYCLE_WAIT_MS = parseInt(process.env.CYCLE_WAIT_MS || '90000', 10); // 1.5 min
const ALERT_WEBHOOK = process.env.ALERT_WEBHOOK || null;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function randomBetween(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

async function alertWebhook(msg) {
  if (!ALERT_WEBHOOK) return;
  try {
    // Slack/Telegram simple text payload
    await fetch(ALERT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `[E2EE BOT] ${msg}` })
    });
  } catch (e) {
    console.error('Alert failed:', e.message || e);
  }
}

async function sendMessage(page, target, message) {
  try {
    const url = `https://www.facebook.com/messages/e2ee/t/${encodeURIComponent(target)}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Try common contenteditable selector(s)
    const selectors = [
      'div[role="textbox"][contenteditable="true"]',
      'div[contenteditable="true"][role="combobox"]',
      'div[contenteditable="true"]',
      'textarea',
      'input[aria-label="Message"]'
    ];

    let textbox = null;
    for (const sel of selectors) {
      try {
        const el = await page.$(sel);
        if (el) { textbox = el; break; }
      } catch (e) { /* ignore */ }
    }

    if (!textbox) {
      console.log(`Textbox not found for target ${target}. Skipping.`);
      return false;
    }

    await textbox.focus();

    // Type message line-by-line, preserving newlines with Shift+Enter
    const lines = message.split('\n');
    for (let i = 0; i < lines.length; i++) {
      await page.keyboard.type(lines[i], { delay: 25 });
      if (i < lines.length - 1) {
        await page.keyboard.down('Shift');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Shift');
        await page.waitForTimeout(100);
      }
    }
    await page.keyboard.press('Enter');

    console.log(`Message sent to ${target}`);
    return true;
  } catch (err) {
    console.error(`Error sending to ${target}:`, err && err.message ? err.message : err);
    return false;
  }
}

async function runBot() {
  let browser = null;
  try {
    // Validate files
    if (!fs.existsSync(STORAGE_FILE)) throw new Error('storageState.json not found. Use save_storage_state.js to create it.');
    if (!fs.existsSync(TARGET_FILE)) throw new Error('target.txt not found');
    if (!fs.existsSync(MESSAGE_FILE)) throw new Error('message.txt not found');

    const targets = fs.readFileSync(TARGET_FILE, 'utf-8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const message = fs.readFileSync(MESSAGE_FILE, 'utf-8');

    if (!targets.length) throw new Error('No targets in target.txt');
    if (!message.trim()) throw new Error('message.txt is empty');

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const context = await browser.newContext({ storageState: STORAGE_FILE });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(30000);

    console.log('E2EE Secret Bot started (storageState loaded).');

    const retryQueue = [];

    while (true) {
      // If retryQueue has items, try them first
      const huntList = retryQueue.length ? [...retryQueue] : [...targets];
      retryQueue.length = 0;

      for (const target of huntList) {
        const ok = await sendMessage(page, target, message);
        if (!ok) {
          retryQueue.push(target);
        }
        const delay = randomBetween(MIN_DELAY_MS, MAX_DELAY_MS);
        console.log(`Waiting ${delay}ms before next message...`);
        await sleep(delay);
      }

      if (retryQueue.length) {
        console.warn(`Retry queue length: ${retryQueue.length}`);
        await alertWebhook(`Retry queue has ${retryQueue.length} targets: ${retryQueue.join(', ')}`);
      }

      console.log(`Cycle complete. Waiting ${CYCLE_WAIT_MS}ms before next cycle.`);
      await sleep(CYCLE_WAIT_MS);
    }

  } catch (err) {
    console.error('Fatal error in bot:', err && err.message ? err.message : err);
    await alertWebhook(`Fatal error: ${err && err.message ? err.message : err}`);
    if (browser) {
      try { await browser.close(); } catch (e) { /* ignore */ }
    }
    process.exit(1); // Let Render restart
  }
}

// Crash handlers
process.on('uncaughtException', async (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
  await alertWebhook(`Uncaught Exception: ${err && err.message ? err.message : err}`);
  process.exit(1);
});
process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled Rejection:', reason);
  await alertWebhook(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

// Start
runBot();
