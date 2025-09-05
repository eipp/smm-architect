# Devcontainer for SMM Architect
FROM node:20-bullseye

# Install Python distutils and build tools
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        python3-distutils \
        python3-pip \
        build-essential \
        git \
    && rm -rf /var/lib/apt/lists/*

# Enable corepack for pnpm
RUN corepack enable

WORKDIR /workspace

CMD ["bash"]
