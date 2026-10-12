"""Site web Nogalix servi par le serveur FastAPI (un seul serveur pour le site et l'API).

- session.py      : cookie de session HttpOnly ⇄ jeton Bearer, protection CSRF
- security.py     : en-têtes de sécurité (CSP, X-Frame-Options…)
- images.py       : optimisation d'images (/_image)
- site.py         : fichiers statiques, pages (SEO, gardes, 404), manifeste, config publique
- geo.py          : /api/geoLocalisation
- compression.py  : gzip des pages et réponses API
"""

from fastapi import FastAPI


def register_web(app: FastAPI) -> None:
    from app.web.compression import CompressionMiddleware
    from app.web.geo import router as geo_router
    from app.web.images import router as images_router
    from app.web.security import SecurityHeadersMiddleware
    from app.web.session import WebSessionMiddleware, router as session_router
    from app.web.site import router as site_router

    app.include_router(session_router)
    app.include_router(geo_router)
    app.include_router(images_router)
    # En dernier : la route attrape-tout des pages du site.
    app.include_router(site_router)

    app.add_middleware(WebSessionMiddleware)
    app.add_middleware(CompressionMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
