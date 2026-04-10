"""
User Pydantic schemas for the authentication system assignment.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


PHONE_PATTERN = r"^\+?[1-9]\d{7,14}$"


class UserBaseInput(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: EmailStr
    phone_number: str = Field(..., pattern=PHONE_PATTERN)
    city: str = Field(..., min_length=1)
    age: int = Field(..., gt=0)
    type: str = Field(..., pattern="^(admin|client)$")

    @field_validator("first_name", "last_name", "city")
    @classmethod
    def strip_and_require_value(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must not be empty")
        return cleaned


class RegisterInput(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: EmailStr
    phone_number: str = Field(..., pattern=PHONE_PATTERN)
    city: str = Field(..., min_length=1)
    age: int = Field(..., gt=0)
    password: str = Field(..., min_length=6)

    @field_validator("first_name", "last_name", "city")
    @classmethod
    def strip_and_require_value(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must not be empty")
        return cleaned


class LoginInput(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserUpdateInput(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1)
    last_name: Optional[str] = Field(None, min_length=1)
    email: Optional[EmailStr] = Field(None)
    phone_number: Optional[str] = Field(None, pattern=PHONE_PATTERN)
    city: Optional[str] = Field(None, min_length=1)
    age: Optional[int] = Field(None, gt=0)
    type: Optional[str] = Field(None, pattern="^(admin|client)$")
    password: Optional[str] = Field(None, min_length=6)

    @field_validator("first_name", "last_name", "city", mode="before")
    @classmethod
    def strip_and_require_value(cls, value):
        if value is None:
            return None
        cleaned = value.strip() if isinstance(value, str) else value
        if isinstance(cleaned, str) and not cleaned:
            raise ValueError("must not be empty")
        return cleaned


class UserPublic(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone_number: str
    city: str
    age: int
    type: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    token: str
    user: UserPublic
