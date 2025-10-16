# Use slim Python base
FROM python:3.13-slim

# Set work directory
WORKDIR /app

# Install system dependencies for Chromium (minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libasound2 \
    libatk1.0-0 \
    libcups2 \
    libgtk-3-0 \
    libgbm1 \
    libpango-1.0-0 \
    libxshmfence1 \
    libpangocairo-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy necessary project files
COPY bot.py cookies.json targets.txt messages.txt prefix.txt ./

# Install only Chromium for Playwright
RUN python -m playwright install chromium --with-deps

# Expose Flask port
EXPOSE 8080

# Optional: persist logs outside container
VOLUME ["/app/logs.txt"]

# Start the bot
CMD ["python", "bot.py"]
