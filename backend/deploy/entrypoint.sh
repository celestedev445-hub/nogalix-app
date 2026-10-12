#!/bin/sh
set -e

# Migrations avant le démarrage (idempotent)
alembic upgrade head

exec gunicorn app.main:app \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers "${WEB_CONCURRENCY:-2}" \
  --bind 0.0.0.0:8010 \
  --timeout "${GUNICORN_TIMEOUT:-180}" \
  --forwarded-allow-ips "${FORWARDED_ALLOW_IPS:-*}" \
  --access-logfile - \
  --error-logfile -
