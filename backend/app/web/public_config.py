"""Configuration publique transmise au navigateur (`window.__NOGALIX_CONFIG__`).

Tout vient du .env du serveur : aucune valeur figée à la compilation du site.
Ne jamais y placer de secret.
"""

from __future__ import annotations

import json

from app.core.config import settings


def public_config() -> dict[str, str]:
    return {
        "appName": settings.app_name,
        "appShortName": settings.app_short_name or settings.app_name,
        "appUrl": settings.public_app_url,
        "googleClientId": settings.google_client_id,
        "turnstileSiteKey": settings.turnstile_site_key,
        "assistantName": settings.assistant_name,
        "assistantFirstName": settings.assistant_first_name or settings.assistant_name,
        "contactEmail": settings.public_contact_email or settings.contact_to_email,
        "supportEmail": settings.support_email,
        "contactPhone": settings.contact_phone,
        "cbcName": settings.cbc_name,
        "cbcUrl": settings.cbc_url,
        "adminEmails": settings.public_admin_emails,
        "onlyOfficeUrl": settings.onlyoffice_url,
    }


def public_config_script() -> str:
    payload = json.dumps(public_config(), ensure_ascii=False, separators=(",", ":"))
    # Neutralise toute séquence capable de fermer la balise <script>.
    payload = payload.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    payload = payload.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    return f"<script>window.__NOGALIX_CONFIG__={payload};</script>"


def render_fingerprint() -> dict[str, str]:
    """Valeurs effectives d'appConfig (frontend/src/lib/appConfig.ts) qui changent l'affichage.

    Comparées à celles du pré-rendu (dist/.vite/prerender/index.json) : si elles diffèrent,
    le HTML pré-rendu n'est pas utilisé (la page est alors rendue par le navigateur).
    """
    config = public_config()

    def value(key: str, fallback: str = "") -> str:
        raw = config.get(key) or ""
        return raw if raw else fallback

    return {
        "name": value("appName", "Nogalix"),
        "shortName": value("appShortName", "Nogalix"),
        "assistantName": value("assistantName", "Noga"),
        "assistantFirstName": value("assistantFirstName", "Noga"),
        "contactEmail": value("contactEmail", "contact@nogalix.com"),
        "supportEmail": value("supportEmail"),
        "contactPhone": value("contactPhone"),
        "cbcName": value("cbcName", "CBC"),
        "cbcUrl": value("cbcUrl", "https://contactsbusinesscenter.com"),
    }


if __name__ == "__main__":
    # Utilisé par start.bat : python -m app.web.public_config <fichier> (configuration du pré-rendu).
    import sys

    payload = json.dumps(public_config(), ensure_ascii=False)
    if len(sys.argv) > 1:
        with open(sys.argv[1], "w", encoding="utf-8") as handle:
            handle.write(payload)
    else:
        print(payload)
