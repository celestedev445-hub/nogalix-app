"""Importe tous les modèles pour que les relations SQLAlchemy (et Alembic) les connaissent."""

from app.modules.contact.models import ContactMessage  # noqa: F401
from app.modules.documents.models import SavedJob, UserDocument  # noqa: F401
from app.modules.payments.models import Payment  # noqa: F401
from app.modules.plans.models import Plan, PlanFeature, PlanLimitation  # noqa: F401
from app.modules.support.models import SupportTicket, SupportTicketReply  # noqa: F401
from app.modules.users.models import CurriculumVitae, Notification, PersonalAccessToken, User  # noqa: F401
