#!/bin/sh
set -e
cd /srv/mcp
python ensure_setup.py
exec python server.py
