from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from core.database import Base


class GuestMember(Base):
    __tablename__ = "guest_members"

    id = Column(Integer, primary_key=True, autoincrement=True)
    guest_id = Column(Integer, ForeignKey("guests.id", ondelete="CASCADE"), nullable=False)
    table_id = Column(Integer, ForeignKey("tables.id", ondelete="SET NULL"), nullable=True)  # NULL = դեռ նստեցված չէ
    first_name = Column(String(255), nullable=True)  # Կարող է լինել NULL, եթե դեռ անունը չեն գրել
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    guest = relationship("Guest", back_populates="members")
    table = relationship("Table", back_populates="members")