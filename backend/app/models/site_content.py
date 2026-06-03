from sqlalchemy import Column, DateTime, Integer, String, Text, func

from app.db.base import Base


class SiteContent(Base):
    __tablename__ = "site_content"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(64), unique=True, nullable=False, index=True)
    data = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
