# Base image with Python 3.13
FROM python:3.13-slim

# Set work directory
WORKDIR /app

# Copy project files
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright Chromium
RUN python -m playwright install chromium

# Expose Flask port
EXPOSE 8080

# Start the bot
CMD ["python", "bot.py"]
