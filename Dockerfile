# Nogalix — un seul serveur : le site (React compilé) et l'API (FastAPI) dans la même image.
#   docker build -t nogalix .
# Voir DEPLOIEMENT.md (docker-compose.prod.yml).

# ---------------------------------------------------------------------------
# 1. Compilation du site (Node n'est utilisé qu'ici, jamais en production)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
RUN mkdir -p public && npm ci
COPY frontend/ ./
RUN npm run build

# ---------------------------------------------------------------------------
# 2. Serveur Python (site + API)
# ---------------------------------------------------------------------------
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    WEB_DIST_DIR=/app/web

WORKDIR /app

# Dépendances natives de PyMuPDF / OpenCV (pdf2docx)
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY backend/alembic.ini .
COPY backend/alembic ./alembic
COPY backend/app ./app
COPY backend/scripts/create_admin.py ./scripts/create_admin.py
COPY backend/deploy/entrypoint.sh /entrypoint.sh
COPY --from=web /web/dist ./web

RUN useradd --create-home --uid 10001 nogalix \
    && mkdir -p storage/uploads storage/imports storage/documents storage/cache \
    && chown -R nogalix:nogalix /app \
    && chmod +x /entrypoint.sh

USER nogalix
EXPOSE 8010

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8010/api/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
