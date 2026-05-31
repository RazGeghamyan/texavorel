from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from core.database import Base


class Wedding(Base):
    __tablename__ = "weddings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    tables = relationship("Table", back_populates="wedding", cascade="all, delete-orphan")
    guests = relationship("Guest", back_populates="wedding", cascade="all, delete-orphan")