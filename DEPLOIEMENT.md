# Mise en production Nogalix

Architecture : **un seul serveur applicatif** (comme AvexSend). Le serveur Python (FastAPI) sert à la fois :

- le **site** : l'interface React/Tailwind est compilée en fichiers statiques (`frontend/dist`) puis servie par Python — plus de Next.js ni de serveur Node en production ;
- l'**API** sur `/api/*` ;
- la **session** : cookie HttpOnly `authToken` (le jeton n'est jamais lisible en JavaScript), protection CSRF, redirections des pages protégées ;
- les balises **SEO** de chaque page, les **images optimisées** (`/_image`, WebP), le manifeste PWA.

Vitesse :

- **pages pré-rendues** : à la compilation, chaque page est générée en HTML (`frontend/scripts/prerender.mjs`) ; le
  serveur l'envoie directement (affichage immédiat, avant le JavaScript), puis React la reprend sans la redessiner.
  Si le nom de l'app ou les e-mails de contact du `.env` changent, recompilez (`start.bat build`) — sinon les pages
  restent correctes mais sont dessinées par le navigateur (le serveur l'indique au démarrage) ;
- fichiers du site précompressés (Brotli/gzip), mis en cache un an (noms versionnés) ; pages et API compressées ;
- images PNG/JPEG publiques servies en WebP aux navigateurs compatibles (même adresse, mêmes dimensions) ;
- recherche d'offres mise en cache 10 min, géolocalisation par IP 6 h ; certificats TLS chargés une seule fois.

En production : **Caddy** (HTTPS automatique) → **app** (serveur unique, port 8010) → **MySQL 8 (InnoDB)** + **Redis** (rate-limit partagé). OnlyOffice est optionnel.

La base de données est **inchangée** (mêmes tables, mêmes migrations Alembic).

## 1. Prérequis

- Un serveur Linux avec Docker et Docker Compose v2, ports 80/443 ouverts.
- DNS : `APP_DOMAIN` (et `OFFICE_DOMAIN` si OnlyOffice) pointant vers le serveur.
- Comptes : SMTP, Google Cloud (client OAuth « Web », **origine JavaScript autorisée** `https://<APP_DOMAIN>`), Gemini, Adzuna/RapidAPI, **MeSomb**.

## 2. MeSomb (paiement Mobile Money)

1. Dans https://business.mesomb.com, créez une **application dédiée à Nogalix** (ne réutilisez pas celle d'un autre site : le webhook est propre à chaque application).
2. Récupérez l'Access Key, la Secret Key et l'Application Key → `MESOMB_API_KEY`, `MESOMB_API_SECRET`, `MESOMB_APPLICATION_KEY`.
3. Webhook : `https://<APP_DOMAIN>/api/payments/webhook`, et copiez son secret dans `MESOMB_WEBHOOK_SECRET`.
4. Tant que ces clés sont vides, la page Plans affiche « Paiement en ligne bientôt disponible ». Rien ne plante.

Fonctionnement : l'utilisateur choisit Pro/Premium, 1 ou 12 mois (−20 %), saisit son numéro MTN/Orange et valide sur son téléphone. L'app suit le statut (polling et webhook, toujours revérifié auprès de MeSomb), active le plan jusqu'à l'échéance, envoie un reçu, puis repasse l'utilisateur en Gratuit à l'expiration. Aucun prélèvement automatique.

## 3. Déploiement

```bash
cp deploy/.env.production.example .env      # à la racine, puis remplir
docker compose -f docker-compose.prod.yml up -d --build
# avec l'éditeur Word :
docker compose -f docker-compose.prod.yml --profile onlyoffice up -d --build

# premier administrateur
docker compose -f docker-compose.prod.yml exec app python scripts/create_admin.py admin@domaine.com --create
```

L'image (`Dockerfile` à la racine) compile le site avec Node puis ne garde que Python : un seul conteneur applicatif.
Les migrations Alembic sont appliquées automatiquement au démarrage.

Toutes les valeurs affichées par le site (nom, client Google, Turnstile, OnlyOffice, e-mails de contact…) sont lues
dans `.env` **au démarrage** : un simple redémarrage suffit après un changement, sans recompiler.

Secrets à générer : `openssl rand -hex 32` pour `IMPORT_ACCESS_SECRET` et `ONLYOFFICE_JWT_SECRET`, et des mots de passe forts pour `DB_PASSWORD` et `DB_ROOT_PASSWORD`.

Sans Docker Compose (ex. Coolify) : construire le `Dockerfile` de la racine, port **8010**, volume persistant sur `/app/storage`,
mêmes variables que `.env.production.example` (avec `DB_HOST`, `APP_ENV=production`, `APP_DEBUG=false`). Une seule instance
du conteneur suffit ; pour plusieurs instances, renseigner `RATELIMIT_STORAGE_URI` (Redis).

## 4. Sauvegardes

- Base : `docker compose -f docker-compose.prod.yml exec db mysqldump -u root -p nogalix > sauvegarde.sql` (à planifier, et à stocker **hors** du dépôt).
- Fichiers : le volume `backend_storage` (imports de CV, documents, avatars locaux, cache d'images).

## 5. Vérifications après mise en ligne

- `https://<APP_DOMAIN>/` s'affiche, et l'inscription puis la connexion fonctionnent (e-mail et Google).
- Mot de passe oublié : l'e-mail arrive.
- Création d'un CV, export PDF, analyse IA.
- Paiement test avec un petit montant (vous pouvez créer temporairement un plan à 100 FCFA depuis Admin → Plans).
- Admin → Paiements : la transaction apparaît « Payé ».

## 6. Développement local

Un seul serveur sur **http://localhost:8010** (site + API) :

```bat
start.bat           :: installe si besoin, compile le site s'il ne l'est pas, migre la base, démarre
start.bat build     :: recompile le site d'abord (après une modification du frontend)
```

Configuration : `backend/.env` (d'après `backend/.env.example`) — c'est le seul fichier d'environnement.
Dans Google Cloud, ajoutez `http://localhost:8010` aux origines JavaScript autorisées du client OAuth.

Pour travailler sur l'interface avec rechargement à chaud : laissez le serveur tourner (8010), puis
`cd frontend && npm run dev` et ouvrez http://localhost:3000 (Vite relaie `/api` et les routes serveur vers 8010).
Avant de livrer : `npm run build` (vérification TypeScript + compilation).

- WAMP : `my.ini` fixe `default_storage_engine=MYISAM`. La migration 0007 convertit les tables en InnoDB, mais mieux vaut passer `default_storage_engine=InnoDB`.
- OnlyOffice local : `scripts/start-onlyoffice.ps1` (port 8082). `docker-compose.onlyoffice.yml` autorise les adresses privées,
  sinon le Document Server refuse de télécharger le document (« Échec du téléchargement »).
