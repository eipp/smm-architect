# Development Guide

This repository includes a Docker-based development container that provides all required system dependencies.

## Using the Dev Container

1. **Build the container:**

```bash
docker build -f tools/devcontainer/Dockerfile -t smm-architect-dev .
```

2. **Start the container:**

```bash
docker run --rm -it -v $(pwd):/workspace smm-architect-dev
```

3. **Install dependencies inside the container:**

```bash
pnpm install
```

The container includes Python distutils and common build tools so native modules compile correctly. It can also be opened directly with compatible editors such as VS Code via `tools/devcontainer/devcontainer.json`.
