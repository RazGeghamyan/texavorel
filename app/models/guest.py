from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from core.database import Base


class Guest(Base):
    __tablename__ = "guests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    wedding_id = Column(Integer, ForeignKey("weddings.id", ondelete="CASCADE"), nullable=False)
    display_name = Column(String(255), nullable=False)  # "Արամ" կամ "Մանուկյան ընտանիք"
    total_count = Column(Integer, nullable=False, default=1)
    side = Column(String(50), nullable=False)      # 'bride', 'groom', 'mutual'
    status = Column(String(50), nullable=False)    # 'pending', 'confirmed', 'declined'
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    wedding = relationship("Wedding", back_populates="guests")
    members = relationship("GuestMember", back_populates="guest", cascade="all, delete-orphan")