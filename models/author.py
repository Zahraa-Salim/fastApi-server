"""
Author Pydantic schemas.

Request models:
  - AuthorCreate   — validates POST /api/authors body (name, email, bio)
  - AuthorUpdate   — validates PATCH /api/authors/:id body (all fields optional)

Response models:
  - AuthorResponse — author data returned by the API (id, name, email, bio, status, timestamps)
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# -- Request bodies -----------------------------------------------------------

class AuthorCreate(BaseModel):
    """Equivalent to createAuthorSchema body"""
    name: str = Field(..., min_length=2)
    email: EmailStr
    bio: Optional[str] = ""


class AuthorUpdate(BaseModel):
    """Equivalent to updateAuthorSchema body"""
    name: Optional[str] = Field(None, min_length=2)
    email: Optional[EmailStr] = None
    bio: Optional[str] = None


# -- Response shape -----------------------------------------------------------

class AuthorResponse(BaseModel):
    """What the API returns for a single author"""
    id: int
    name: str
    email: str
    bio: str
    status: str
    deletedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

    model_config = {"from_attributes": True}
