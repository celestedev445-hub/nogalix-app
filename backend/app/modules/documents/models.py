from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.mysql import JSON, MEDIUMTEXT
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.responses import iso_utc


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


DOCUMENT_KINDS = ("lettre", "export", "piece")


class UserDocument(Base):
    __tablename__ = "user_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="lettre", index=True)
    title: Mapped[str] = mapped_column(String(190), nullable=False)
    file_name: Mapped[str] = mapped_column(String(190), nullable=False)
    mime: Mapped[str] = mapped_column(String(120), nullable=False, default="text/plain")
    size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cv_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    body: Mapped[Optional[str]] = mapped_column(Text().with_variant(MEDIUMTEXT(), "mysql"), nullable=True)
    storage_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "kind": self.kind,
            "title": self.title,
            "fileName": self.file_name,
            "mime": self.mime,
            "size": self.size,
            "cvId": self.cv_id,
            "body": self.body,
            "hasFile": bool(self.storage_path),
            "createdAt": iso_utc(self.created_at),
            "updatedAt": iso_utc(self.updated_at),
        }


class SavedJob(Base):
    __tablename__ = "saved_jobs"
    __table_args__ = (UniqueConstraint("user_id", "job_id", name="uq_saved_jobs_user_job"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    job_id: Mapped[str] = mapped_column(String(190), nullable=False)
    payload: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.job_id,
            "job": self.payload,
            "savedAt": iso_utc(self.created_at),
        }
