FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (ffmpeg for media conversion)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=24917
EXPOSE 24917

CMD ["python", "server.py"]
