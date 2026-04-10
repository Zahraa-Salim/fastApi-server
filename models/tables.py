"""
SQLAlchemy ORM table definitions for PostgreSQL.

Defines three tables:
  - UserTable   — authentication users (admin/client)
  - AuthorTable — blog authors
  - PostTable   — blog posts

PostTable has a joined relationship to AuthorTable for eager-loading author data.
All tables use auto-increment integer primary keys and UTC timestamps.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime,
    ForeignKey, ARRAY,
)
from sqlalchemy.orm import relationship
from config.db import Base


def _utcnow():
    return datetime.now(timezone.utc)


class UserTable(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone_number = Column(String(50), nullable=False)
    city = Column(String(255), nullable=False)
    age = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False, default="client")
    password = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)


class AuthorTable(Base):
    __tablename__ = "authors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    bio = Column(Text, nullable=False, default="")
    status = Column(String(50), nullable=False, default="active")
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    # Reverse relationship
    posts = relationship("PostTable", back_populates="author")


class PostTable(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    slug = Column(String(500), unique=True, nullable=False)
    content = Column(Text, nullable=False)
    image = Column(String(1000), nullable=True)
    status = Column(String(50), nullable=False, default="draft")
    tags = Column(ARRAY(String), nullable=False, default=list)
    author_id = Column(Integer, ForeignKey("authors.id"), nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    # Eager-load author by default
    author = relationship("AuthorTable", back_populates="posts", lazy="joined")
