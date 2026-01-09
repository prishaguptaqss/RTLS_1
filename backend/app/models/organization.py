"""
Organization model for RTLS system.
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Organization(Base):
    """Organization model - top level of the building hierarchy."""
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(String, unique=True, nullable=False, index=True, comment="User-provided organization ID")
    name = Column(String, nullable=False, comment="Organization name")
    logo = Column(String, nullable=True, comment="Path to organization logo file")
    display_name = Column(String(7), nullable=False, comment="Short display name (max 7 characters)")
    address = Column(String, nullable=False, comment="Organization address")
    country = Column(String, nullable=False, comment="Country")
    pincode = Column(String, nullable=False, comment="Postal/PIN code")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    buildings = relationship("Building", back_populates="organization", cascade="all, delete-orphan")
    patients = relationship("Patient", back_populates="organization", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="organization", cascade="all, delete-orphan")
    anchors = relationship("Anchor", back_populates="organization", cascade="all, delete-orphan")
    settings = relationship("OrganizationSettings", back_populates="organization", uselist=False, cascade="all, delete-orphan")
    staff_members = relationship("Staff", back_populates="organization", cascade="all, delete-orphan")
    roles = relationship("Role", back_populates="organization", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="organization", cascade="all, delete-orphan")
