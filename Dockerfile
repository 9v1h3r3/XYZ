# ================== Dockerfile ==================
FROM python:3.13-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget gnupg ca-certificates fonts-liberation libnss3 libatk-bridge2.0-0 \
    libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 libasound2 libatk1.0-0 \
    libcups2 libgtk-3-0 libgbm1 libpango-1.0-0 libxshmfence1 \
    fonts-unifont fonts-ubuntu fontconfig xvfb x11-utils && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /bot

# Copy bot files
COPY . /bot

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir playwright flask asyncio

# Install Playwright browsers
RUN python -m playwright install chromium --with-deps

# Expose port for Flask
EXPOSE 5000

# Run the bot with supervisor
CMD ["python", "bot.py"]
