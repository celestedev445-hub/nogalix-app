import logging
import threading
from pathlib import Path

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.limiter import limiter, rate_limit_handler
from app.modules import models_registry  # noqa: F401 — enregistre tous les modèles SQLAlchemy
from app.modules.admin.router import router as admin_router
from app.modules.assistant.router import router as assistant_router
from app.modules.auth.router import router as auth_router
from app.modules.contact.router import router as contact_router
from app.modules.convert.router import router as convert_router
from app.modules.cv.router import router as cv_router
from app.modules.documents.router import router as documents_router
from app.modules.health.router import router as health_router
from app.modules.jobs.router import router as jobs_router
from app.modules.notifications.router import router as notifications_router
from app.modules.payments.reminders import start_payment_reconciliation, start_plan_reminders
from app.modules.payments.router import router as payments_router
from app.modules.profile.router import router as profile_router
from app.modules.plans.router import router as plans_router
from app.modules.candidature.router import router as candidature_router
from app.modules.support.router import router as support_router
from app.modules.templates.router import router as templates_router
from app.core.http import warm_up as warm_up_http
from app.web import register_web
from app.web.assets import log_build_status
from app.web.images import warm_static_webp


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        docs_url="/docs" if settings.app_debug else None,
        redoc_url=None,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
    app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining"],
    )

    register_exception_handlers(app)

    api = APIRouter(prefix="/api")
    api.include_router(health_router)
    api.include_router(auth_router)
    api.include_router(cv_router)
    api.include_router(profile_router)
    api.include_router(notifications_router)
    api.include_router(assistant_router)
    api.include_router(contact_router)
    api.include_router(convert_router)
    api.include_router(templates_router)
    api.include_router(plans_router)
    api.include_router(candidature_router)
    api.include_router(jobs_router)
    api.include_router(support_router)
    api.include_router(payments_router)
    api.include_router(admin_router)
    api.include_router(documents_router)
    app.include_router(api)

    uploads = Path(__file__).resolve().parent.parent / "storage" / "uploads"
    uploads.mkdir(parents=True, exist_ok=True)
    app.mount("/storage/uploads", StaticFiles(directory=str(uploads)), name="uploads")

    # Site web (pages, fichiers statiques, session par cookie) : même serveur que l'API.
    register_web(app)
    log_build_status()
    # Certificats TLS chargés une fois ici plutôt que pendant une requête.
    warm_up_http()
    # Versions WebP des images publiques, préparées en arrière-plan.
    threading.Thread(target=warm_static_webp, name="warm-static-webp", daemon=True).start()
    # Rappels avant la fin des abonnements et retour au plan Gratuit à l'échéance.
    start_plan_reminders()
    # Paiements MeSomb restés en attente : revérifiés toutes les 5 minutes.
    start_payment_reconciliation()

    return app


app = create_app()
