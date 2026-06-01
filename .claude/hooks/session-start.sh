#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (remote) environments.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install app dependencies so lint (tsc) and tests (vitest) work in-session.
# `npm install` (not `ci`) keeps the cached container state reusable.
npm install --no-audit --no-fund
