from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base


class Version(Base):
    __tablename__ = "versions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False)
    is_published = Column(Boolean, default=False)
    is_latest = Column(Boolean, default=False)
    snapshot_path = Column(String(500), nullable=True)
    base_version_id = Column(Integer, ForeignKey("versions.id"), nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    product = relationship("Product", back_populates="versions")
    documents = relationship("Document", back_populates="version", cascade="all, delete-orphan")
    base_version = relationship("Version", remote_side=[id])

    __table_args__ = (UniqueConstraint("product_id", "slug", name="uix_version_product_slug"),)
