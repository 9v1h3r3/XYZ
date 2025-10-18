# E2EE Secret Messenger Bot (Render-ready)

**WARNING:** This repository contains automation to send messages using an authenticated browser session. Use responsibly — do not spam, follow Facebook's Terms of Service and privacy rules.

## Files
- `e2ee-secret-bot-autonomous.js` - main bot script
- `save_storage_state.js` - run locally to create `storageState.json`
- `target.txt` - one UID/username per line
- `message.txt` - message to send
- `package.json`
- `.gitignore`

## Steps to prepare `storageState.json` (locally)
1. `npm install`
2. `npm run save-state`
3. Browser opens. Log in to Facebook and optionally open secret conversation(s) (`/messages/e2ee/t/{UID}`).
4. Press ENTER in terminal to save `storageState.json`.

## Deploy to Render.com
1. Create a **Private** repo with these files (do NOT commit `storageState.json` to public repo).
2. Add repo to Render and create a **Background Worker** service.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add environment variables if desired:
   - `MIN_DELAY_MS`, `MAX_DELAY_MS`, `CYCLE_WAIT_MS`
   - `ALERT_WEBHOOK` (Slack/Telegram webhook)
6. Deploy. Monitor logs and adjust delays if necessary.

## Security
- Treat `storageState.json` as a secret. If leaked, rotate session by logging out and creating a fresh `storageState.json`.
- Use private repo or Render file store / secrets.

## Notes
- If secret conversation does not exist for a UID, the bot may not open the `/messages/e2ee/t/{UID}` page and will skip that target.
- Increase delays to reduce risk of being flagged for automation.
