"""users: email verification code and plan expiry reminder stage

Revision ID: 0008_email_verify_plan_reminders
Revises: 0007_payments_admin_documents
Create Date: 2026-10-12
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008_email_verify_plan_reminders"
down_revision: Union[str, None] = "0007_payments_admin_documents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email_verify_code", sa.String(length=255), nullable=True))
    op.add_column(
        "users",
        sa.Column("email_verify_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("plan_reminder_stage", sa.Integer(), nullable=False, server_default="0"),
    )
    # Les comptes existants ne sont pas soumis à la nouvelle vérification.
    op.execute("UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL")


def downgrade() -> None:
    op.drop_column("users", "plan_reminder_stage")
    op.drop_column("users", "email_verify_expires_at")
    op.drop_column("users", "email_verify_code")
