"""
Author service — business logic for the Author resource.

- create_author(): checks duplicate email, inserts a new author row.
- get_authors(): paginated list with filter/search/sort via ApiFeatures.
- get_author_by_id(): fetches a single non-deleted author by ID.
- update_author(): partial update of author fields.
- delete_author(): soft delete (sets status="deleted"). Blocked if the
  author still has active (non-deleted) posts.
"""

from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.tables import AuthorTable, PostTable
from utils.api_features import ApiFeatures


def _author_to_dict(author: AuthorTable) -> dict:
    """Convert AuthorTable row to camelCase API dict."""
    return {
        "id": author.id,
        "name": author.name,
        "email": author.email,
        "bio": author.bio,
        "status": author.status,
        "deletedAt": author.deleted_at,
        "createdAt": author.created_at,
        "updatedAt": author.updated_at,
    }


async def create_author(data: dict, session: AsyncSession) -> dict:
    """Equivalent to createAuthor() in author.service.ts"""

    # Duplicate email check
    result = await session.execute(
        select(AuthorTable).where(AuthorTable.email == data["email"])
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already in use")

    now = datetime.now(timezone.utc)
    author = AuthorTable(
        name=data["name"],
        email=data["email"],
        bio=data.get("bio", ""),
        status="active",
        deleted_at=None,
        created_at=now,
        updated_at=now,
    )
    session.add(author)
    await session.flush()
    await session.refresh(author)

    return _author_to_dict(author)


async def get_authors(query_params: dict, session: AsyncSession) -> dict:
    """
    Equivalent to getAuthors() in author.service.ts.
    Supports filtering, search, sort, pagination.
    """
    features = (
        ApiFeatures(AuthorTable, query_params)
        .filter(["name", "email"])
        .search(["name", "email"])
        .sort("-created_at")
        .paginate(10, 100)
        .add_where(AuthorTable.status != "deleted")
    )

    total, authors = await features.execute(session)
    serialized = [_author_to_dict(a) for a in authors]

    return {
        "page": features.page,
        "limit": features.limit,
        "total": total,
        "totalPages": max(1, -(-total // features.limit)),
        "results": len(serialized),
        "data": serialized,
    }


async def get_author_by_id(id: int, session: AsyncSession) -> dict:
    """Equivalent to getAuthorById() in author.service.ts"""

    result = await session.execute(
        select(AuthorTable).where(AuthorTable.id == id, AuthorTable.status != "deleted")
    )
    author = result.scalar_one_or_none()

    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    return _author_to_dict(author)


async def update_author(id: int, data: dict, session: AsyncSession) -> dict:
    """Equivalent to updateAuthor() in author.service.ts"""

    result = await session.execute(
        select(AuthorTable).where(AuthorTable.id == id, AuthorTable.status != "deleted")
    )
    author = result.scalar_one_or_none()

    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    # Update only non-None values
    update_data = {k: v for k, v in data.items() if v is not None}

    if "email" in update_data and update_data["email"] != author.email:
        duplicate = await session.execute(
            select(AuthorTable).where(
                AuthorTable.email == update_data["email"],
                AuthorTable.id != id,
            )
        )
        if duplicate.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Email already in use")

    for key, value in update_data.items():
        if hasattr(author, key):
            setattr(author, key, value)
    author.updated_at = datetime.now(timezone.utc)

    await session.flush()
    await session.refresh(author)

    return _author_to_dict(author)


async def delete_author(id: int, session: AsyncSession) -> None:
    """
    Equivalent to deleteAuthor() in author.service.ts.
    Soft deletes -- blocks if author still has active posts.
    """
    result = await session.execute(
        select(AuthorTable).where(AuthorTable.id == id, AuthorTable.status != "deleted")
    )
    author = result.scalar_one_or_none()

    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    # Block delete if author still has active posts
    count_result = await session.execute(
        select(func.count()).select_from(PostTable).where(
            PostTable.author_id == id,
            PostTable.status != "deleted",
        )
    )
    active_posts = count_result.scalar() or 0

    if active_posts > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete author: this author still has posts. Delete the author's posts first.",
        )

    # Soft delete
    author.status = "deleted"
    author.deleted_at = datetime.now(timezone.utc)
    await session.flush()
