# SMM Architect Development Guide

This guide describes how to set up a local development environment using the provided Docker-based dev container.

## Prerequisites

- Docker 20+
- Git

## Build the Dev Container

```bash
docker build -t smm-architect-dev -f tools/devcontainer/Dockerfile .
```

## Start an Interactive Shell

Run the container and mount the repository:

```bash
docker run --rm -it -v "$(pwd)":/workspace smm-architect-dev
```

The container includes Node.js, pnpm, Python `distutils`, and common build tools. On startup it runs `pnpm install` to install project dependencies.

## Using VS Code Dev Containers

If you use VS Code, open the repository and choose **Dev Containers: Reopen in Container**. The configuration in `tools/devcontainer/devcontainer.json` will be used automatically.

