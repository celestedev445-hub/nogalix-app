# Nogalix — serveur

FastAPI + SQLAlchemy + Alembic + Pydantic + MySQL.

Ce serveur est **le seul serveur de Nogalix** : il sert l'API (`/api/*`) **et** le site
(interface React compilée dans `../frontend/dist`, voir `app/web/`).

## Stack

- FastAPI / Uvicorn
- MySQL (`nogalix`)
- Alembic migrations
- Opaque Bearer tokens (style Sanctum) — côté site, portés par un cookie HttpOnly (`app/web/session.py`)
- Cloudinary (avatars / audio)
- Gemini (assistant, avec repli local)

## Architecture

```
app/
  core/          config, db, security, deps, responses
  support/       cloudinary, google auth
  modules/       auth, cv, profile, notifications, assistant, contact, health, templates,
                 plans, payments, admin, documents, jobs, candidature, convert, support
  web/           site : pages (SEO, gardes, 404), fichiers statiques, session cookie,
                 en-têtes de sécurité, images optimisées (/_image), config publique
alembic/
```

Rôles : `user` / `admin` (back-office `/api/admin/*`). Premier admin : `python scripts/create_admin.py <email> [--create]`.

Paiement : MeSomb (Mobile Money MTN / Orange), module `app/modules/payments`.

Les **layouts de modèles CV** restent dans le frontend ; le backend stocke les **données** (`templateId` + payload JSON).

## Démarrage

Le plus simple : `start.bat` à la racine du projet (installe, compile le site, migre, démarre).

À la main :

```bash
cd frontend && npm install && npm run build && cd ..   # site compilé dans frontend/dist
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
```

> Port `8000`/`8001` peuvent être pris par Cursor en local — `8010` est le port recommandé.

Site : `http://localhost:8010`  
API : `http://localhost:8010/api`  
Docs : `http://localhost:8010/docs` (si `APP_DEBUG=true`)

Toute la configuration (y compris les valeurs publiques du site : nom, client Google, OnlyOffice…) est dans `.env`.


## Production

Voir `../DEPLOIEMENT.md` (Docker : `../Dockerfile` à la racine — compile le site puis l'embarque —, gunicorn + uvicorn workers, migrations au démarrage).

## Tests

```bash
SMOKE_BASE=http://127.0.0.1:8010/api python scripts/smoke_test.py
```
