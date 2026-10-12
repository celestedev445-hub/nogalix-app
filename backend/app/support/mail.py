import html
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import Iterable, Optional, Union

from app.core.config import settings

logger = logging.getLogger(__name__)

SUBMISSION_PORT = 587
SMTPS_PORT = 465


class MailTransportError(RuntimeError):
    """Transport SMTP non sécurisable (ex. STARTTLS indisponible sur 587)."""


def _recipients(to: Union[str, Iterable[str]]) -> list[str]:
    if isinstance(to, str):
        items = [to]
    else:
        items = list(to)
    return [item.strip() for item in items if item and item.strip()]


def _open_smtp() -> smtplib.SMTP:
    context = ssl.create_default_context()
    port = int(settings.mail_port or SUBMISSION_PORT)
    if port == SMTPS_PORT:
        return smtplib.SMTP_SSL(settings.mail_host, port, timeout=30, context=context)

    smtp = smtplib.SMTP(settings.mail_host, port, timeout=30)
    try:
        smtp.ehlo()
        if smtp.has_extn("starttls"):
            # Si STARTTLS est annoncé mais échoue, on lève : pas d'envoi en clair.
            smtp.starttls(context=context)
            smtp.ehlo()
        elif port == SUBMISSION_PORT or settings.mail_username:
            raise MailTransportError(
                "Le serveur SMTP ne propose pas STARTTLS : envoi en clair refusé."
            )
        # Autres ports sans authentification (relais local type MailHog) : clair toléré.
    except Exception:
        try:
            smtp.close()
        except Exception:
            pass
        raise
    return smtp


def send_mail(
    to: Union[str, Iterable[str]],
    subject: str,
    html: str,
    text: Optional[str] = None,
) -> bool:
    """Envoi générique (synchrone : à appeler via run_in_threadpool).

    Les valeurs dynamiques insérées dans `html` doivent déjà être échappées
    (html.escape). Retourne True si l'e-mail est parti, False sinon (erreur loggée).
    """
    recipients = _recipients(to)
    if not recipients:
        logger.warning("Aucun destinataire — email non envoyé (%s)", subject)
        return False
    if not settings.mail_host:
        logger.warning("MAIL_HOST vide — email non envoyé (%s)", subject)
        return False

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = formataddr((settings.mail_from_name, settings.mail_from_address))
    message["To"] = ", ".join(recipients)
    if text:
        message.attach(MIMEText(text, "plain", "utf-8"))
    message.attach(MIMEText(html, "html", "utf-8"))

    try:
        with _open_smtp() as smtp:
            if settings.mail_username:
                smtp.login(settings.mail_username, settings.mail_password)
            smtp.sendmail(settings.mail_from_address, recipients, message.as_string())
        logger.info("Email envoyé à %s (%s)", ", ".join(recipients), subject)
        return True
    except Exception:
        logger.exception("Échec envoi email à %s (%s)", ", ".join(recipients), subject)
        return False


def send_html_mail(*, to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> bool:
    """Compatibilité : délègue à send_mail."""
    return send_mail(to_email, subject, html_body, text_body)


def reset_password_email_html(*, user_name: str, reset_code: str) -> str:
    name = html.escape((user_name or "").strip())
    greeting = f"Bonjour <strong>{name}</strong>," if name else "Bonjour,"
    app = html.escape(settings.app_name or "")
    reset_code = html.escape(str(reset_code))
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Réinitialisation de mot de passe pour {app}</title>
</head>
<body style="margin:0;padding:30px 10px;font-family:Arial,sans-serif;background:#EEF2FF;color:#0F172A;">
  <div style="max-width:600px;margin:0 auto;">
    <div style="background:#3A83F7;border-radius:10px 10px 0 0;padding:28px 32px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;">{app}</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px;">Réinitialisation de mot de passe</p>
    </div>
    <div style="background:#fff;padding:32px;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
      <p style="font-size:15px;line-height:1.7;color:#334155;margin:0 0 16px;">{greeting}</p>
      <p style="font-size:15px;line-height:1.7;color:#334155;margin:0 0 16px;">
        Vous avez demandé la réinitialisation de votre mot de passe.
        Utilisez le code ci-dessous pour définir un nouveau mot de passe :
      </p>
      <div style="margin:24px 0;background:#F8FAFC;border:2px dashed #3A83F7;border-radius:8px;padding:20px;text-align:center;">
        <div style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
          Votre code de réinitialisation
        </div>
        <div style="font-size:34px;font-weight:800;color:#3A83F7;letter-spacing:8px;">{reset_code}</div>
        <div style="font-size:12px;color:#4338CA;font-weight:600;margin-top:10px;">Valable pendant 1 heure</div>
      </div>
      <div style="background:#EEF2FF;border-left:4px solid #4338CA;border-radius:4px;padding:12px 16px;font-size:13px;color:#312E81;">
        Si vous n'avez pas effectué cette demande, ignorez cet e-mail. Votre mot de passe ne sera pas modifié.
        Ne partagez jamais ce code avec quiconque.
      </div>
    </div>
    <div style="background:#EEF2FF;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 10px 10px;padding:20px 32px;text-align:center;font-size:12px;color:#64748B;">
      <p style="margin:0;">Cet e-mail a été envoyé automatiquement par <strong style="color:#3A83F7;">{app}</strong>.</p>
      <p style="margin:6px 0 0;">Ne répondez pas directement à cet e-mail.</p>
    </div>
  </div>
</body>
</html>"""
