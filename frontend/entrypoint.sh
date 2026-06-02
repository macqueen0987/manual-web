#!/bin/sh
set -e

PACKAGE_HASH=$(sha256sum package.json | awk '{print $1}')
HASH_FILE="node_modules/.package.json.sha256"

if [ ! -f "$HASH_FILE" ] || [ "$(cat $HASH_FILE)" != "$PACKAGE_HASH" ]; then
  echo "Installing dependencies..."
  npm install --legacy-peer-deps
  echo "$PACKAGE_HASH" > "$HASH_FILE"
else
  echo "Dependencies up to date."
fi

exec npm run dev -- --host 0.0.0.0
