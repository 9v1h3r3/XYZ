# Base Python image (stable)
FROM python:3.12-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libffi-dev wget ca-certificates \
    fonts-liberation libnss3 libatk-bridge2.0-0 libx11-xcb1 libxcomposite1 \
    libxdamage1 libxrandr2 libasound2 libatk1.0-0 libcups2 libgtk-3-0 \
    libgbm1 libpango-1.0-0 libxshmfence1 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Upgrade pip + install deps
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

COPY bot.py cookies.json targets.txt messages.txt prefix.txt ./

# Install Chromium (Playwright)
RUN python -m playwright install chromium --with-deps

EXPOSE 8080
CMD ["python", "bot.py"]
