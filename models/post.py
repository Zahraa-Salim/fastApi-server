"""
Post Pydantic schemas.

Request models:
  - PostCreate    — validates POST /api/posts body (title, slug, content, author ID, tags, status)
  - PostUpdate    — validates PATCH /api/posts/:id body (all fields optional)

Response models:
  - AuthorRef     — minimal author info (id, name, email) embedded in post responses
  - PostResponse  — full post data with nested author, tags, and timestamps
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# -- Request bodies -----------------------------------------------------------

class PostCreate(BaseModel):
    """Equivalent to createPostSchema body"""
    title: str = Field(..., min_length=3)
    slug: str = Field(..., min_length=3)
    content: str = Field(..., min_length=10)
    image: Optional[str] = None
    status: Optional[str] = Field("draft", pattern="^(draft|published)$")
    tags: Optional[List[str]] = []
    author: int = Field(..., gt=0)  # author ID (integer FK)


class PostUpdate(BaseModel):
    """Equivalent to updatePostSchema body"""
    title: Optional[str] = Field(None, min_length=3)
    slug: Optional[str] = Field(None, min_length=3)
    content: Optional[str] = Field(None, min_length=10)
    image: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(draft|published|deleted)$")
    tags: Optional[List[str]] = None
    author: Optional[int] = Field(None, gt=0)


# -- Nested author in response -----------------------------------------------

class AuthorRef(BaseModel):
    """Author info embedded in post responses"""
    id: int
    name: str
    email: str

    model_config = {"from_attributes": True}


# -- Response shape -----------------------------------------------------------

class PostResponse(BaseModel):
    id: int
    title: str
    slug: str
    content: str
    image: Optional[str] = None
    status: str
    tags: List[str]
    author: Optional[AuthorRef] = None
    publishedAt: Optional[datetime] = None
    deletedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

    model_config = {"from_attributes": True}
