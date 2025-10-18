/**
 * Fully Autonomous E2EE Messenger Bot for Render
 * Features:
 * - Secret conversations: /messages/e2ee/t/{UID}
 * - Cookie-based session (E2EE handled automatically by Web client)
 * - Retry queue for failed messages
 * - Randomized delays
 * - Crash-safe, 24/7 compatible with Render
 * - Optional Slack/Telegram alerts
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { chromium } = require('playwright');

// ====== CONFIG ======
const COOKIE_FILE = path.resolve(__dirname, 'cookies.json');
const TARGET_FILE = path.resolve(__dirname, 'target.txt');
const MESSAGE_FILE = path.resolve(__dirname, 'message.txt');

const MIN_DELAY_MS = parseInt(process.env.MIN_DELAY_MS || '3000');
const MAX_DELAY_MS = parseInt(process.env.MAX_DELAY_MS || '7000');
const CYCLE_WAIT_MS = parseInt(process.env.CYCLE_WAIT_MS || '90000'); // 1.5 min

const ALERT_WEBHOOK = process.env.ALERT_WEBHOOK || null; // Slack/Telegram webhook URL

// ====== UTILS ======
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function alert(message) {
  if (!ALERT_WEBHOOK) return;
  try {
    await fetch(ALERT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `[E2EE BOT ALERT] ${message}` })
    });
  } catch (e) {
    console.error('Failed to send alert:', e.message);
  }
}

// ====== MESSAGE SENDING ======
async function sendMessage(page, target, message) {
  try {
    const url = `https://www.facebook.com/messages/e2ee/t/${encodeURIComponent(target)}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const textbox = await page.$('div[role="textbox"][contenteditable="true"]');
    if (!textbox) {
      console.log(`Textbox not found for target: ${target}`);
      return false;
    }

    await textbox.focus();
    const lines = message.split('\n');
    for (let i = 0; i < lines.length; i++) {
      await page.keyboard.type(lines[i], { delay: 25 });
      if (i < lines.length - 1) {
        await page.keyboard.down('Shift');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Shift');
      }
    }
    await page.keyboard.press('Enter');
    console.log(`Message sent to ${target}`);
    return true;
  } catch (err) {
    console.error(`Error sending to ${target}:`, err.message);
    return false;
  }
}

// ====== BOT ======
async function runBot() {
  let browser;
  try {
    if (!fs.existsSync(COOKIE_FILE)) throw new Error('cookies.json not found');
    if (!fs.existsSync(TARGET_FILE)) throw new Error('target.txt not found');
    if (!fs.existsSync(MESSAGE_FILE)) throw new Error('message.txt not found');

    const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
    const targets = fs.readFileSync(TARGET_FILE, 'utf-8').split(/\r?\n/).filter(Boolean);
    const message = fs.readFileSync(MESSAGE_FILE, 'utf-8');

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const context = await browser.newContext();
    await context.addCookies(cookies);

    const page = await context.newPage();
    page.setDefaultNavigationTimeout(30000);

    console.log('E2EE Secret Bot started!');

    const retryQueue = [];

    while (true) {
      const currentTargets = retryQueue.length ? [...retryQueue] : [...targets];
      retryQueue.length = 0;

      for (const target of currentTargets) {
        const success = await sendMessage(page, target, message);
        if (!success) retryQueue.push(target);
        await sleep(randomBetween(MIN_DELAY_MS, MAX_DELAY_MS));
      }

      if (retryQueue.length) {
        console.log(`Retry queue contains ${retryQueue.length} targets.`);
        await alert(`Retry queue: ${retryQueue.join(', ')}`);
      }

      console.log(`Cycle complete. Waiting ${CYCLE_WAIT_MS / 1000}s before next cycle...`);
      await sleep(CYCLE_WAIT_MS);
    }

  } catch (err) {
    console.error('Fatal error:', err.message);
    await alert(`Fatal error: ${err.message}`);
    if (browser) await browser.close();
    process.exit(1);
  }
}

// ====== CRASH SAFE HANDLERS ======
process.on('uncaughtException', async (err) => {
  console.error('Uncaught Exception:', err);
  await alert(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});
process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled Rejection:', reason);
  await alert(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

// ====== START BOT ======
runBot();
