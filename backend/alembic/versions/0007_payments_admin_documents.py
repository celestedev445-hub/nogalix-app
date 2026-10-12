"""payments, plan expiry, contact messages, user documents, saved jobs

Revision ID: 0007_payments_admin_documents
Revises: 0006_support_tickets
Create Date: 2026-09-28
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import mysql

revision: str = "0007_payments_admin_documents"
down_revision: Union[str, None] = "0006_support_tickets"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Clés étrangères attendues par les révisions 0001–0006 (absentes si les tables ont été
# créées en MyISAM, ex. WAMP avec default_storage_engine=MYISAM).
_EXPECTED_FKS = [
    ("personal_access_tokens", "user_id", "users", "CASCADE"),
    ("cvs", "user_id", "users", "CASCADE"),
    ("notifications", "user_id", "users", "CASCADE"),
    ("users", "plan_id", "plans", "SET NULL"),
    ("plan_limitations", "plan_id", "plans", "CASCADE"),
    ("plan_features", "plan_id", "plans", "CASCADE"),
    ("support_tickets", "user_id", "users", "CASCADE"),
    ("support_ticket_replies", "support_ticket_id", "support_tickets", "CASCADE"),
    ("support_ticket_replies", "user_id", "users", "CASCADE"),
]


def _ensure_innodb() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "mysql":
        return
    op.execute("SET SESSION default_storage_engine=InnoDB")
    rows = bind.execute(
        sa.text(
            "SELECT TABLE_NAME FROM information_schema.TABLES "
            "WHERE TABLE_SCHEMA = DATABASE() AND ENGINE <> 'InnoDB' AND TABLE_TYPE = 'BASE TABLE'"
        )
    ).fetchall()
    for (table,) in rows:
        op.execute(f"ALTER TABLE `{table}` ENGINE=InnoDB")

    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    for table, column, ref, ondelete in _EXPECTED_FKS:
        if table not in tables or ref not in tables:
            continue
        existing = inspector.get_foreign_keys(table)
        if any(fk.get("constrained_columns") == [column] for fk in existing):
            continue
        # Lignes orphelines : sinon la création de la contrainte échoue.
        if ondelete == "SET NULL":
            op.execute(
                f"UPDATE `{table}` SET `{column}` = NULL WHERE `{column}` IS NOT NULL "
                f"AND `{column}` NOT IN (SELECT id FROM `{ref}`)"
            )
        else:
            op.execute(f"DELETE FROM `{table}` WHERE `{column}` NOT IN (SELECT id FROM `{ref}`)")
        op.create_foreign_key(f"fk_{table}_{column}"[:64], table, ref, [column], ["id"], ondelete=ondelete)


def upgrade() -> None:
    _ensure_innodb()
    op.add_column("users", sa.Column("plan_expires_at", sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("reference", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("plan_id", sa.Integer(), nullable=True),
        sa.Column("plan_slug", sa.String(length=80), nullable=False),
        sa.Column("plan_name", sa.String(length=120), nullable=False),
        sa.Column("months", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="XAF"),
        sa.Column("provider", sa.String(length=30), nullable=False, server_default="mesomb"),
        sa.Column("service", sa.String(length=30), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("provider_reference", sa.String(length=120), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("raw", mysql.JSON(), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        mysql_engine="InnoDB",
    )
    op.create_index("ix_payments_reference", "payments", ["reference"], unique=True)
    op.create_index("ix_payments_user_id", "payments", ["user_id"])
    op.create_index("ix_payments_status", "payments", ["status"])
    op.create_index("ix_payments_provider_reference", "payments", ["provider_reference"])

    op.create_table(
        "contact_messages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=190), nullable=False),
        sa.Column("objet", sa.String(length=190), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="nouveau"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        mysql_engine="InnoDB",
    )
    op.create_index("ix_contact_messages_user_id", "contact_messages", ["user_id"])
    op.create_index("ix_contact_messages_status", "contact_messages", ["status"])

    op.create_table(
        "user_documents",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False, server_default="lettre"),
        sa.Column("title", sa.String(length=190), nullable=False),
        sa.Column("file_name", sa.String(length=190), nullable=False),
        sa.Column("mime", sa.String(length=120), nullable=False, server_default="text/plain"),
        sa.Column("size", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cv_id", sa.String(length=36), nullable=True),
        sa.Column("body", sa.Text().with_variant(mysql.MEDIUMTEXT(), "mysql"), nullable=True),
        sa.Column("storage_path", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        mysql_engine="InnoDB",
    )
    op.create_index("ix_user_documents_user_id", "user_documents", ["user_id"])
    op.create_index("ix_user_documents_kind", "user_documents", ["kind"])

    op.create_table(
        "saved_jobs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.String(length=190), nullable=False),
        sa.Column("payload", mysql.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "job_id", name="uq_saved_jobs_user_job"),
        mysql_engine="InnoDB",
    )
    op.create_index("ix_saved_jobs_user_id", "saved_jobs", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_saved_jobs_user_id", table_name="saved_jobs")
    op.drop_table("saved_jobs")
    op.drop_index("ix_user_documents_kind", table_name="user_documents")
    op.drop_index("ix_user_documents_user_id", table_name="user_documents")
    op.drop_table("user_documents")
    op.drop_index("ix_contact_messages_status", table_name="contact_messages")
    op.drop_index("ix_contact_messages_user_id", table_name="contact_messages")
    op.drop_table("contact_messages")
    op.drop_index("ix_payments_provider_reference", table_name="payments")
    op.drop_index("ix_payments_status", table_name="payments")
    op.drop_index("ix_payments_user_id", table_name="payments")
    op.drop_index("ix_payments_reference", table_name="payments")
    op.drop_table("payments")
    op.drop_column("users", "plan_expires_at")
