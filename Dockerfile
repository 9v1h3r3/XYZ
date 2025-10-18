# Base image
FROM python:3.13-slim

# Set workdir
WORKDIR /app

# Copy project files
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Chromium for Playwright
RUN python -m playwright install chromium

# Expose port
EXPOSE 5000

# Start bot
CMD ["python", "bot.py"]
