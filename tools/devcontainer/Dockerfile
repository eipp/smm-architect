FROM mcr.microsoft.com/devcontainers/javascript-node:18

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-distutils \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

