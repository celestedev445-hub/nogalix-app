from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Nogalix"
    app_env: str = "local"
    app_debug: bool = True
    app_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"
    frontend_urls: str = "http://localhost:3000,http://127.0.0.1:3000"

    db_host: str = "127.0.0.1"
    db_port: int = 3306
    db_database: str = "nogalix"
    db_username: str = "root"
    db_password: str = ""

    auth_token_ttl_minutes: int = 1440

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""

    cloudinary_url: str = ""
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    cloudinary_folder_prefix: str = "nogalix"

    mail_host: str = ""
    mail_port: int = 587
    mail_username: str = ""
    mail_password: str = ""
    mail_from_address: str = "contact@nogalix.com"
    mail_from_name: str = "Nogalix"
    contact_to_email: str = "contact@nogalix.com"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"
    gemini_enabled: bool = False
    gemini_max_output_tokens: int = 512

    assistant_name: str = "Noga"
    admin_emails: str = ""

    onlyoffice_url: str = ""
    onlyoffice_jwt_secret: str = ""
    app_internal_url: str = "http://host.docker.internal:8010"
    # Origine interne du Document Server (autorisée pour les téléchargements du callback)
    onlyoffice_internal_url: str = ""
    import_access_secret: str = ""

    adzuna_app_id: str = ""
    adzuna_app_key: str = ""
    adzuna_country: str = "fr"

    rapidapi_key: str = ""
    jsearch_host: str = "jsearch.p.rapidapi.com"
    jsearch_country: str = "fr"

    # MeSomb — paiements Mobile Money (https://business.mesomb.com)
    mesomb_api_base_url: str = "https://mesomb.hachther.com"
    mesomb_api_key: str = ""
    mesomb_api_secret: str = ""
    mesomb_application_key: str = ""
    mesomb_auth: str = "hmac"
    mesomb_locale: str = "fr"
    mesomb_language: str = "fr"
    mesomb_api_version: str = "v1.1"
    mesomb_country: str = "CM"
    mesomb_currency: str = "XAF"
    mesomb_timeout: int = 120
    mesomb_connect_timeout: int = 15
    mesomb_collect_mode: str = "asynchronous"
    mesomb_webhook_secret: str = ""
    mesomb_webhook_url: str = ""
    # Remise (en %) sur la souscription annuelle (12 mois)
    yearly_discount_percent: int = 20

    # KeyPay / MasterKey — paiement par carte uniquement (Stripe via KeyPay)
    keypay_api_base_url: str = "https://keypay-api.masterkeycm.com"
    keypay_api_key: str = ""
    keypay_api_secret: str = ""
    keypay_environment: str = "SANDBOX"
    keypay_timeout: int = 60
    keypay_webhook_secret: str = ""
    keypay_webhook_url: str = ""
    keypay_currency: str = "XAF"

    # Stockage privé des documents utilisateurs (lettres, pièces jointes)
    documents_max_bytes: int = 10 * 1024 * 1024

    # ------------------------------------------------------------------
    # Site web (servi par ce même serveur, voir app/web)
    # ------------------------------------------------------------------
    # Dossier du site compilé (frontend/dist). Vide = ../frontend/dist à côté du backend.
    web_dist_dir: str = ""
    # Attribut Secure du cookie de session : true/false. Vide = actif seulement en production.
    auth_cookie_secure: str = ""
    # Valeurs publiques transmises au navigateur (window.__NOGALIX_CONFIG__)
    app_short_name: str = ""
    assistant_first_name: str = ""
    turnstile_site_key: str = ""
    # E-mail de contact affiché sur le site (défaut : CONTACT_TO_EMAIL)
    public_contact_email: str = ""
    support_email: str = ""
    contact_phone: str = ""
    cbc_name: str = "CBC"
    cbc_url: str = "https://contactsbusinesscenter.com"
    # E-mails affichés comme administrateurs dans l'interface en attendant le rôle en base (optionnel)
    public_admin_emails: str = ""

    @property
    def public_app_url(self) -> str:
        """URL publique du site (balises SEO, liens absolus)."""
        return (self.frontend_url or self.app_url or "").strip().rstrip("/")

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"production", "prod"}

    @property
    def mesomb_enabled(self) -> bool:
        return bool(self.mesomb_api_key and self.mesomb_api_secret)

    @property
    def keypay_enabled(self) -> bool:
        return bool(self.keypay_api_key and self.keypay_api_secret)

    @property
    def database_url(self) -> str:
        password = self.db_password or ""
        auth = self.db_username
        if password:
            auth = f"{self.db_username}:{password}"
        return (
            f"mysql+pymysql://{auth}@{self.db_host}:{self.db_port}/"
            f"{self.db_database}?charset=utf8mb4"
        )

    @property
    def cors_origins(self) -> List[str]:
        raw = self.frontend_urls or self.frontend_url
        origins = [item.strip() for item in raw.split(",") if item.strip()]
        if self.app_env.lower() in {"local", "development", "dev", "test"}:
            defaults = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ]
            for item in defaults:
                if item not in origins:
                    origins.append(item)
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()  # reload picks up .env changes on uvicorn --reload


settings = get_settings()
