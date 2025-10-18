# ===========================
# 🔹 Base image: lightweight Python
# ===========================
FROM python:3.13-slim

# ===========================
# 🔹 Set working directory
# ===========================
WORKDIR /app

# ===========================
# 🔹 Copy project files
# ===========================
COPY . /app

# ===========================
# 🔹 Install base system dependencies
# ===========================
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget gnupg ca-certificates \
    fonts-liberation libnss3 libatk-bridge2.0-0 libx11-xcb1 \
    libxcomposite1 libxdamage1 libxrandr2 libasound2 libatk1.0-0 \
    libcups2 libgtk-3-0 libgbm1 libpango-1.0-0 libxshmfence1 \
    fonts-unifont fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

# ===========================
# 🔹 Install Python dependencies
# ===========================
RUN pip install --no-cache-dir -r requirements.txt

# ===========================
# 🔹 Install Playwright Chromium
# ===========================
RUN python -m playwright install chromium

# ===========================
# 🔹 Expose Flask Port (Replit/Render use 5000)
# ===========================
EXPOSE 5000

# ===========================
# 🔹 Start the bot
# ===========================
CMD ["python", "bot.py"]
