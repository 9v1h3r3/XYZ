FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install only necessary dependencies for Chromium headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget ca-certificates fonts-liberation libnss3 libatk-bridge2.0-0 \
    libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 libasound2 libatk1.0-0 \
    libcups2 libgtk-3-0 libgbm1 libpango-1.0-0 libxshmfence1 fontconfig xvfb \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /bot

# Copy bot files
COPY . /bot

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir playwright flask asyncio

# Install Playwright browsers
RUN python -m playwright install chromium --with-deps

# Expose Flask port
EXPOSE 5000

# Run the bot
CMD ["python", "bot.py"]
