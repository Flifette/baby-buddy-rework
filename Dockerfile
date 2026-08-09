FROM python:3.12-alpine AS build

RUN apk add --no-cache nodejs npm

COPY baby-buddy-dashboard/frontend/ /tmp/frontend/
WORKDIR /tmp/frontend
RUN npm ci && npm run build

FROM python:3.12-alpine

LABEL org.opencontainers.image.source="https://github.com/Flifette/baby-buddy-rework" \
      org.opencontainers.image.description="Standalone container for Baby Buddy Dashboard Rework" \
      org.opencontainers.image.licenses="MIT"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MILK_WASTE_FILE=/data/milk-waste.json

COPY baby-buddy-dashboard/backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt

COPY --from=build /tmp/frontend/dist/ /app/static/
COPY baby-buddy-dashboard/backend/ /app/backend/

RUN addgroup -S dashboard && \
    adduser -S -G dashboard dashboard && \
    mkdir -p /data && \
    chown -R dashboard:dashboard /app /data

WORKDIR /app
USER dashboard
EXPOSE 8099
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8099/api/config', timeout=3)" || exit 1

CMD ["python3", "-m", "uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8099", "--log-level", "info"]
