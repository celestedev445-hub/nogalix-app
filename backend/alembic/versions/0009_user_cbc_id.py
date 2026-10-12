"""users: identifiant du compte CBC lié (connexion « Se connecter avec CBC »)

Revision ID: 0009_user_cbc_id
Revises: 0008_email_verify_plan_reminders
Create Date: 2026-10-12
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009_user_cbc_id"
down_revision: Union[str, None] = "0008_email_verify_plan_reminders"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("cbc_id", sa.Integer(), nullable=True))
    op.create_unique_constraint("uq_users_cbc_id", "users", ["cbc_id"])


def downgrade() -> None:
    op.drop_constraint("uq_users_cbc_id", "users", type_="unique")
    op.drop_column("users", "cbc_id")
