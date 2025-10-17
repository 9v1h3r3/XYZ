# ✅ Stable base image
FROM python:3.12-slim

WORKDIR /app

# ✅ Install Playwright dependencies (minimal stable set)
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget gnupg ca-certificates \
    fonts-liberation fonts-noto-color-emoji fonts-dejavu-core \
    libnss3 libatk-bridge2.0-0 libx11-xcb1 libxcomposite1 \
    libxdamage1 libxrandr2 libasound2 libatk1.0-0 libcups2 \
    libgtk-3-0 libgbm1 libpango-1.0-0 libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

# ✅ Copy requirements first (Docker layer cache optimization)
COPY requirements.txt .

RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# ✅ Copy project files
COPY bot.py cookies.json targets.txt messages.txt prefix.txt ./

# ✅ Install Playwright Chromium manually (no --with-deps)
RUN python -m playwright install chromium

# ✅ Expose Flask port
EXPOSE 8080

# ✅ Start the bot
CMD ["python", "bot.py"]
