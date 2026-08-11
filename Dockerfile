# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM node:20.15.1-alpine3.20@sha256:09dbe0a53523c2482d85a037efc6b0e8e8bb16c6f1acf431fe36aa0ebc871c06 AS build

COPY baby-buddy-dashboard/frontend/ /tmp/frontend/
WORKDIR /tmp/frontend
RUN npm ci && npm run build

FROM python:3.12.13-alpine3.22@sha256:a190708a2dec1bd18b1decb539f8e8f5407abaa9bf39cacda583f7f8c11db322

LABEL org.opencontainers.image.source="https://github.com/Flifette/baby-buddy-rework" \
      org.opencontainers.image.description="Standalone container for Baby Buddy Dashboard Rework" \
      org.opencontainers.image.licenses="MIT"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MILK_WASTE_FILE=/data/milk-waste.json

COPY baby-buddy-dashboard/backend/requirements.lock /tmp/requirements.lock
RUN pip install --no-cache-dir --require-hashes -r /tmp/requirements.lock && rm /tmp/requirements.lock

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
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8099/healthz', timeout=3)" || exit 1

CMD ["python3", "-m", "uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8099", "--log-level", "info"]
