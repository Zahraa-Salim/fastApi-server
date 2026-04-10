"""
Database seed — runs automatically on every server startup.

Idempotent: safe to run multiple times (skips rows that already exist).

Seeds:
  - 1 admin user + 1 client user
  - 3 authors
  - 6 blog posts (2 per author, mix of draft/published)
"""

import os
import bcrypt
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

from config.db import async_session_factory
from models.tables import UserTable, AuthorTable, PostTable


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

SEED_USERS = [
    {
        "first_name": os.getenv("SUPER_ADMIN_FIRST_NAME", "Development"),
        "last_name": os.getenv("SUPER_ADMIN_LAST_NAME", "Admin"),
        "email": os.getenv("SUPER_ADMIN_EMAIL", "dev-superadmin@example.com"),
        "phone_number": os.getenv("SUPER_ADMIN_PHONE", "+15550000001"),
        "city": os.getenv("SUPER_ADMIN_CITY", "Beirut"),
        "age": int(os.getenv("SUPER_ADMIN_AGE", "30")),
        "password": os.getenv("SUPER_ADMIN_PASSWORD", "change-me-in-env"),
        "type": "admin",
    },
    {
        "first_name": "Sara",
        "last_name": "Client",
        "email": "sara.client@blog.com",
        "phone_number": "+15550000002",
        "city": "Tripoli",
        "age": 26,
        "password": "client123",
        "type": "client",
    },
]

SEED_AUTHORS = [
    {
        "name": "Ahmed Hassan",
        "email": "ahmed@blog.com",
        "bio": "Full-stack developer and tech writer. Passionate about Python, JavaScript, and cloud computing.",
    },
    {
        "name": "Fatima Noor",
        "email": "fatima@blog.com",
        "bio": "UI/UX designer turned developer. Writes about design systems, CSS, and frontend frameworks.",
    },
    {
        "name": "Omar Khalil",
        "email": "omar@blog.com",
        "bio": "DevOps engineer and open-source enthusiast. Covers Docker, CI/CD, and infrastructure.",
    },
]

# Posts reference authors by email (resolved to ID at seed time)
SEED_POSTS = [
    {
        "title": "Getting Started with FastAPI",
        "slug": "getting-started-with-fastapi",
        "content": "FastAPI is a modern Python web framework that makes building APIs fast and easy. It comes with automatic validation via Pydantic, interactive docs via Swagger UI, and async support out of the box. In this post we walk through setting up your first project, creating routes, and connecting to a database.",
        "status": "published",
        "tags": ["python", "fastapi", "backend"],
        "author_email": "ahmed@blog.com",
    },
    {
        "title": "Understanding SQLAlchemy Async",
        "slug": "understanding-sqlalchemy-async",
        "content": "SQLAlchemy 2.0 introduced first-class async support with create_async_engine and AsyncSession. This guide covers setting up an async PostgreSQL connection, defining ORM models, running queries, and managing sessions properly in a FastAPI application.",
        "status": "published",
        "tags": ["python", "sqlalchemy", "postgresql"],
        "author_email": "ahmed@blog.com",
    },
    {
        "title": "Design Systems for Developers",
        "slug": "design-systems-for-developers",
        "content": "A design system is more than a component library — it is a shared language between designers and developers. This article explores how to build a scalable design system using tokens, components, and documentation that keeps your team aligned across projects.",
        "status": "published",
        "tags": ["design", "frontend", "css"],
        "author_email": "fatima@blog.com",
    },
    {
        "title": "Tailwind CSS Tips and Tricks",
        "slug": "tailwind-css-tips-and-tricks",
        "content": "Tailwind CSS has changed how we write styles. In this post we cover advanced patterns like custom utilities, responsive design shortcuts, dark mode configuration, and how to keep your HTML clean while using utility-first CSS effectively.",
        "status": "draft",
        "tags": ["css", "tailwind", "frontend"],
        "author_email": "fatima@blog.com",
    },
    {
        "title": "Docker for Backend Developers",
        "slug": "docker-for-backend-developers",
        "content": "Docker simplifies deployment by packaging your app and its dependencies into containers. This beginner-friendly guide walks through writing a Dockerfile, building images, using docker-compose for multi-service setups, and deploying to production with confidence.",
        "status": "published",
        "tags": ["docker", "devops", "backend"],
        "author_email": "omar@blog.com",
    },
    {
        "title": "CI/CD Pipelines with GitHub Actions",
        "slug": "cicd-pipelines-github-actions",
        "content": "Continuous integration and deployment doesn't have to be complicated. GitHub Actions lets you automate testing, building, and deploying your code with simple YAML workflows. This post covers setting up a pipeline for a Python project from scratch.",
        "status": "draft",
        "tags": ["devops", "github", "cicd"],
        "author_email": "omar@blog.com",
    },
]


# ---------------------------------------------------------------------------
# Seed functions
# ---------------------------------------------------------------------------

async def _seed_users(session) -> None:
    """Seed user accounts (idempotent — skips existing emails)."""
    now = datetime.now(timezone.utc)
    created = 0

    for data in SEED_USERS:
        result = await session.execute(
            select(UserTable).where(UserTable.email == data["email"])
        )
        existing = result.scalar_one_or_none()

        hashed = _hash(data["password"])

        if not existing:
            session.add(UserTable(
                first_name=data["first_name"],
                last_name=data["last_name"],
                email=data["email"],
                phone_number=data["phone_number"],
                city=data["city"],
                age=data["age"],
                password=hashed,
                type=data["type"],
                is_active=True,
                created_at=now,
                updated_at=now,
            ))
            created += 1
        else:
            # Keep the seeded admin up to date
            if data["type"] == "admin":
                existing.password = hashed
                existing.first_name = data["first_name"]
                existing.last_name = data["last_name"]
                existing.phone_number = data["phone_number"]
                existing.city = data["city"]
                existing.age = data["age"]
                existing.type = data["type"]
                existing.is_active = True
                existing.updated_at = now

    await session.flush()
    if created:
        print(f"  Users seeded: {created} created")
    else:
        print("  Users seed verified (all exist)")


async def _seed_authors(session) -> dict:
    """Seed authors. Returns {email: author_id} map for post seeding."""
    now = datetime.now(timezone.utc)
    created = 0
    email_to_id = {}

    for data in SEED_AUTHORS:
        result = await session.execute(
            select(AuthorTable).where(AuthorTable.email == data["email"])
        )
        existing = result.scalar_one_or_none()

        if not existing:
            author = AuthorTable(
                name=data["name"],
                email=data["email"],
                bio=data["bio"],
                status="active",
                created_at=now,
                updated_at=now,
            )
            session.add(author)
            await session.flush()
            email_to_id[data["email"]] = author.id
            created += 1
        else:
            email_to_id[data["email"]] = existing.id

    if created:
        print(f"  Authors seeded: {created} created")
    else:
        print("  Authors seed verified (all exist)")

    return email_to_id


async def _seed_posts(session, email_to_id: dict) -> None:
    """Seed posts (idempotent — skips existing slugs)."""
    now = datetime.now(timezone.utc)
    created = 0

    for i, data in enumerate(SEED_POSTS):
        result = await session.execute(
            select(PostTable).where(PostTable.slug == data["slug"])
        )
        if result.scalar_one_or_none():
            continue

        author_id = email_to_id.get(data["author_email"])
        if not author_id:
            print(f"  WARNING: author {data['author_email']} not found, skipping post '{data['title']}'")
            continue

        is_published = data["status"] == "published"
        # Stagger created_at so posts have different timestamps for sorting
        post_time = now - timedelta(days=len(SEED_POSTS) - i)

        session.add(PostTable(
            title=data["title"],
            slug=data["slug"],
            content=data["content"],
            image=None,
            status=data["status"],
            tags=data.get("tags", []),
            author_id=author_id,
            published_at=post_time if is_published else None,
            created_at=post_time,
            updated_at=post_time,
        ))
        created += 1

    await session.flush()
    if created:
        print(f"  Posts seeded: {created} created")
    else:
        print("  Posts seed verified (all exist)")


# ---------------------------------------------------------------------------
# Main entry point (called from main.py startup)
# ---------------------------------------------------------------------------

async def seed() -> None:
    """Seed all tables with sample data."""
    if os.getenv("SUPER_ADMIN_PASSWORD", "change-me-in-env") == "change-me-in-env":
        print("WARNING: using default development super admin password; set SUPER_ADMIN_PASSWORD in .env")

    async with async_session_factory() as session:
        print("Seeding database...")
        await _seed_users(session)
        email_to_id = await _seed_authors(session)
        await _seed_posts(session, email_to_id)
        await session.commit()
        print("Seeding complete.")
