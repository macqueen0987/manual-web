from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("versions.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    version = relationship("Version", back_populates="documents")
    parent = relationship("Document", remote_side=[id], backref="children")

    __table_args__ = (UniqueConstraint("version_id", "slug", name="uix_document_version_slug"),)
