FROM python:3.13-slim
WORKDIR /app

# Install essential system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl libffi-dev \
    fonts-liberation libnss3 libatk-bridge2.0-0 libx11-xcb1 libxcomposite1 libxdamage1 \
    libxrandr2 libasound2 libatk1.0-0 libcups2 libgtk-3-0 libgbm1 libpango-1.0-0 libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN python -m pip install --upgrade pip

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY bot.py cookies.json targets.txt messages.txt prefix.txt ./

# Install only Chromium for Playwright
RUN python -m playwright install chromium --with-deps

EXPOSE 8080
CMD ["python", "bot.py"]
