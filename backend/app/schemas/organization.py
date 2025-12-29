"""
Pydantic schemas for Organization model.
"""
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from datetime import datetime
from typing import Optional
from app.utils.validators import validate_pincode, get_pincode_format_hint


class OrganizationBase(BaseModel):
    """Base organization schema with common fields."""
    org_id: str
    name: str


class OrganizationCreate(OrganizationBase):
    """Schema for creating a new organization."""
    logo: Optional[str] = None
    display_name: str = Field(..., min_length=1, max_length=7)
    address: str = Field(..., min_length=1)
    country: str = Field(..., min_length=1)
    pincode: str = Field(..., min_length=1)

    @field_validator('display_name')
    @classmethod
    def validate_display_name(cls, v: str) -> str:
        """Validate display name is not empty and max 7 characters."""
        if not v or not v.strip():
            raise ValueError('Display name cannot be empty')
        if len(v) > 7:
            raise ValueError('Display name must be 7 characters or less')
        return v.strip()

    @field_validator('address')
    @classmethod
    def validate_address(cls, v: str) -> str:
        """Validate address is not empty."""
        if not v or not v.strip():
            raise ValueError('Address is required')
        return v.strip()

    @field_validator('country')
    @classmethod
    def validate_country(cls, v: str) -> str:
        """Validate country is not empty."""
        if not v or not v.strip():
            raise ValueError('Country is required')
        return v.strip()

    @model_validator(mode='after')
    def validate_pincode_for_country(self):
        """Validate pincode format based on country."""
        if not validate_pincode(self.pincode, self.country):
            hint = get_pincode_format_hint(self.country)
            raise ValueError(f'Invalid pincode format for {self.country}. Expected: {hint}')
        return self


class OrganizationUpdate(BaseModel):
    """Schema for updating an existing organization."""
    name: Optional[str] = None
    logo: Optional[str] = None
    display_name: Optional[str] = Field(None, min_length=1, max_length=7)
    address: Optional[str] = Field(None, min_length=1)
    country: Optional[str] = Field(None, min_length=1)
    pincode: Optional[str] = Field(None, min_length=1)
    # org_id cannot be changed after creation

    @field_validator('display_name')
    @classmethod
    def validate_display_name(cls, v: Optional[str]) -> Optional[str]:
        """Validate display name if provided."""
        if v is not None:
            if not v.strip():
                raise ValueError('Display name cannot be empty')
            if len(v) > 7:
                raise ValueError('Display name must be 7 characters or less')
            return v.strip()
        return v

    @field_validator('address')
    @classmethod
    def validate_address(cls, v: Optional[str]) -> Optional[str]:
        """Validate address if provided."""
        if v is not None and not v.strip():
            raise ValueError('Address cannot be empty')
        return v.strip() if v else v

    @field_validator('country')
    @classmethod
    def validate_country(cls, v: Optional[str]) -> Optional[str]:
        """Validate country if provided."""
        if v is not None and not v.strip():
            raise ValueError('Country cannot be empty')
        return v.strip() if v else v

    @model_validator(mode='after')
    def validate_pincode_for_country(self):
        """Validate pincode format based on country if both are provided."""
        if self.pincode is not None and self.country is not None:
            if not validate_pincode(self.pincode, self.country):
                hint = get_pincode_format_hint(self.country)
                raise ValueError(f'Invalid pincode format for {self.country}. Expected: {hint}')
        return self


class Organization(OrganizationBase):
    """Complete organization schema returned by API."""
    id: int
    logo: Optional[str] = None
    display_name: str
    address: str
    country: str
    pincode: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
