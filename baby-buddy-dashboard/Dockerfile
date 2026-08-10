# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM node:20.15.1-alpine3.20@sha256:09dbe0a53523c2482d85a037efc6b0e8e8bb16c6f1acf431fe36aa0ebc871c06 AS frontend-builder

WORKDIR /tmp/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

ARG BUILD_ARCH=amd64
FROM ghcr.io/home-assistant/amd64-base-python:3.14-alpine3.20@sha256:8bb2cd27c7d4305843c4ca4d281b6e1f0905e3930d0bb2bf51d9d9575acc3801 AS base-amd64
FROM ghcr.io/home-assistant/aarch64-base-python:3.14-alpine3.20@sha256:bca52e8caad2022c89a15e3244d92cedc988a99f9c7be9044c815e8389b21319 AS base-aarch64
FROM base-${BUILD_ARCH}

# Install Python dependencies
COPY backend/requirements.lock /tmp/requirements.lock
RUN pip3 install --no-cache-dir --require-hashes -r /tmp/requirements.lock

# Copy frontend assets built natively on the runner architecture. This avoids
# executing Node under QEMU when validating the aarch64 runtime image.
COPY --from=frontend-builder /tmp/frontend/dist/ /app/static/

# Copy backend
COPY backend/ /app/backend/

# Copy run script
COPY run.sh /
RUN chmod a+x /run.sh

WORKDIR /app

CMD [ "/run.sh" ]
