from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from core.database import Base


class Table(Base):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True, autoincrement=True)
    wedding_id = Column(Integer, ForeignKey("weddings.id", ondelete="CASCADE"), nullable=False)
    table_number = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False)  # 'presidium', 'rectangle', 'double_rectangle', 'round'
    capacity = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    wedding = relationship("Wedding", back_populates="tables")
    members = relationship("GuestMember", back_populates="table")