#!/usr/bin/env sh
# Production startup script:
# 1. applies Alembic migrations
# 2. starts the FastAPI app with Uvicorn
set -eu

echo "Applying database migrations..."
alembic upgrade head

echo "Starting API server..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
