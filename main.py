import json
import asyncio
import threading
import multiprocessing
import os
import sys
import time
import signal
from datetime import datetime
from flask import Flask, jsonify
from playwright.async_api import async_playwright

app = Flask(__name__)

LOG_FILE = "logs.txt"
STATUS = {
    "running": False,
    "last_target": None,
    "last_thread_name": None,
    "sent_count": 0,
    "errors": 0,
    "restarts": 0,
    "last_restart": None,
    "bot_pid": None,
    "bot_alive": False,
    "login_id": None
}

def now(): return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
def log(msg):
    line = f"[{now()}] {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f: f.write(line+"\n")
    except: pass

@app.route("/")
def home(): return "✅ Messenger Bot (Ultra Pro V3) Running!"
@app.route("/status")
def status(): return jsonify(STATUS)

async def get_thread_name(page):
    try:
        h1 = await page.query_selector("h1")
        if h1: return (await h1.inner_text()).strip()
        div = await page.query_selector("div[aria-label][role='banner']")
        if div: return (await div.get_attribute("aria-label")).strip()
    except: return None
    return None

async def send_message_to_target(page, target_id, messages, prefix, login_id):
    STATUS["last_target"] = target_id
    url = f"https://www.facebook.com/messages/e2ee/t/{target_id}"
    log(f"[{login_id}] -> Opening TargetID: {target_id}")
    try:
        await page.goto(url)
        await page.wait_for_load_state("domcontentloaded")
        await asyncio.sleep(2)
    except Exception as e:
        log(f"[{login_id}] -> Failed to open {target_id}: {e}")
        STATUS["errors"] += 1
        return
    thread_name = await get_thread_name(page)
    STATUS["last_thread_name"] = thread_name
    log(f"[{login_id}] -> TargetID: {target_id} -> ThreadName: {thread_name}")
    while True:
        for msg in messages:
            full_msg = f"{prefix} {msg}".strip()
            try:
                selectors = ['div[aria-label="Message"]','div[contenteditable="true"]','div[role="textbox"]','textarea']
                input_box = None
                for sel in selectors:
                    el = await page.query_selector(sel)
                    if el: input_box = el; break
                if not input_box:
                    log(f"[{login_id}] -> Input box not found for {target_id}")
                    STATUS["errors"] += 1
                    continue
                await input_box.fill(full_msg)
                await input_box.press("Enter")
                log(f"[{login_id}] -> {target_id} -> {thread_name} -> Sent ✅ {full_msg[:50]}")
                STATUS["sent_count"] += 1
            except Exception as e:
                log(f"[{login_id}] -> Error sending to {target_id}: {e}")
                STATUS["errors"] += 1
            await asyncio.sleep(10)

async def safe_send_messages(cookie_file, targets_file, messages_file, prefix_file, concurrency=3):
    STATUS["running"]=True
    with open(cookie_file,"r",encoding="utf-8") as f: raw_cookies=json.load(f)
    cookies=[c for c in raw_cookies if "name" in c and c["name"] and "value" in c and c["value"]]
    login_cookie=next((c for c in cookies if c["name"]=="c_user"),None)
    STATUS["login_id"]=login_cookie["value"] if login_cookie else "Unknown"
    log(f"[i] Using LoginID: {STATUS['login_id']}")
    if not cookies: log("[!] No valid cookies found."); STATUS["running"]=False; return
    with open(targets_file,"r",encoding="utf-8") as f: targets=[l.strip() for l in f if l.strip()]
    with open(messages_file,"r",encoding="utf-8") as f: messages=[l.strip() for l in f if l.strip()]
    with open(prefix_file,"r",encoding="utf-8") as f: prefix=f.read().strip()
    if not targets: log("[!] No targets provided."); STATUS["running"]=False; return

    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True, args=["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage"])
        context=await browser.new_context()
        await context.add_cookies(cookies)
        semaphore=asyncio.Semaphore(concurrency)
        async def sem_task(tid):
            async with semaphore:
                page=await context.new_page()
                try: await send_message_to_target(page, tid, messages, prefix, STATUS["login_id"])
                finally: await page.close()
        tasks=[sem_task(tid) for tid in targets]
        await asyncio.gather(*tasks)
        await browser.close()
    STATUS["running"]=False

def run_bot_process(cookie_file="cookies.json", targets_file="targets.txt", messages_file="messages.txt", prefix_file="prefix.txt", concurrency=3):
    try: asyncio.run(safe_send_messages(cookie_file, targets_file, messages_file, prefix_file, concurrency))
    except Exception as e: log(f"[FATAL] {e}"); sys.exit(1)
    sys.exit(0)

class BotSupervisor:
    def __init__(self,target_fn,max_restarts=9999,base_backoff=2):
        self.target_fn=target_fn; self.proc=None; self._stop=threading.Event()
        self.max_restarts=max_restarts; self.base_backoff=base_backoff; self.restart_count=0
    def start(self):
        t=threading.Thread(target=self._watch_loop,daemon=True); t.start()
    def _start_process(self):
        p=multiprocessing.Process(target=self.target_fn,name="UltraProBotProcess"); p.start()
        log(f"[supervisor] Started bot PID={p.pid}"); STATUS["bot_pid"]=p.pid; STATUS["bot_alive"]=True; return p
    def _watch_loop(self):
        self.proc=self._start_process()
        while not self._stop.is_set():
            self.proc.join(timeout=1)
            if self.proc.is_alive(): STATUS["bot_alive"]=True; time.sleep(1); continue
            STATUS["bot_alive"]=False
            exitcode=self.proc.exitcode; log(f"[supervisor] Bot exited code={exitcode}")
            self.restart_count+=1; STATUS["restarts"]=self.restart_count
            STATUS["last_restart"]=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            backoff=min(60,self.base_backoff*self.restart_count); log(f"[supervisor] Restarting in {backoff}s...")
            time.sleep(backoff); self.proc=self._start_process()
    def stop(self):
        self._stop.set()
        if self.proc and self.proc.is_alive(): self.proc.terminate(); self.proc.join(timeout=5)
        STATUS["bot_alive"]=False

supervisor=None
def parent_graceful_shutdown(signum,frame):
    log(f"[parent] Received {signum}, shutting down."); global supervisor
    if supervisor: supervisor.stop(); sys.exit(0)
signal.signal(signal.SIGINT,parent_graceful_shutdown)
signal.signal(signal.SIGTERM,parent_graceful_shutdown)

if __name__=="__main__":
    def target_wrapper(): run_bot_process("cookies.json","targets.txt","messages.txt","prefix.txt",concurrency=3)
    supervisor=BotSupervisor(target_fn=target_wrapper); supervisor.start()
    log("[parent] Starting Flask on 0.0.0.0:8080")
    app.run(host="0.0.0.0",port=5000,threaded=True)
