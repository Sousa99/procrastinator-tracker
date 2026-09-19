#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:?usage: publish-artifacts.sh <version>}"
PLATFORMS="${PLATFORMS:-linux/amd64}"
GHCR="ghcr.io/sousa99"

docker buildx build --platform "$PLATFORMS" --push \
  -t "$GHCR/procrastinator-tracker-backend:$VERSION" \
  -t "$GHCR/procrastinator-tracker-backend:latest" \
  -f Dockerfile.backend .

docker buildx build --platform "$PLATFORMS" --push \
  -t "$GHCR/procrastinator-tracker-frontend:$VERSION" \
  -t "$GHCR/procrastinator-tracker-frontend:latest" \
  -f Dockerfile.frontend .

echo "[publish] pushed $GHCR/procrastinator-tracker-{backend,frontend}:$VERSION"