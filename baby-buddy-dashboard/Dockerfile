ARG BUILD_ARCH=amd64
FROM ghcr.io/home-assistant/amd64-base-python:3.14-alpine3.20@sha256:8bb2cd27c7d4305843c4ca4d281b6e1f0905e3930d0bb2bf51d9d9575acc3801 AS base-amd64
FROM ghcr.io/home-assistant/aarch64-base-python:3.14-alpine3.20@sha256:bca52e8caad2022c89a15e3244d92cedc988a99f9c7be9044c815e8389b21319 AS base-aarch64
FROM base-${BUILD_ARCH}

# Install Node.js for building frontend (build-time only)
RUN apk add --no-cache nodejs npm

# Install Python dependencies
COPY backend/requirements.lock /tmp/requirements.lock
RUN pip3 install --no-cache-dir --require-hashes -r /tmp/requirements.lock

# Build frontend
COPY frontend/ /tmp/frontend/
WORKDIR /tmp/frontend
RUN npm ci && npm run build

# Move built assets into place
RUN mkdir -p /app/static && \
    cp -r /tmp/frontend/dist/* /app/static/ && \
    rm -rf /tmp/frontend

# Copy backend
COPY backend/ /app/backend/

# Copy run script
COPY run.sh /
RUN chmod a+x /run.sh

WORKDIR /app

CMD [ "/run.sh" ]
