"""
Post service — business logic for the Post resource.

- create_post(): validates slug uniqueness, inserts post with FK to author,
  returns the post with joined author data.
- get_posts(): paginated list with filter (status, author, tag), search,
  sort via ApiFeatures. Eager-loads author relationship.
- get_post_by_id(): fetches a single non-deleted post with author joined.
- update_post(): partial update; manages publishedAt/deletedAt based on
  status transitions (draft/published/deleted).
- delete_post(): soft delete (sets status="deleted", clears publishedAt).
- get_posts_by_author(): same as get_posts but scoped to a single author ID.
"""

from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from models.tables import PostTable, AuthorTable
from utils.api_features import ApiFeatures

DEFAULT_POST_IMAGE = (
    "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d"
    "?auto=format&fit=crop&w=1200&q=80"
)


def _post_to_dict(post: PostTable) -> dict:
    """Convert PostTable row (with joined author) to camelCase API dict."""
    author_data = None
    if post.author:
        author_data = {
            "id": post.author.id,
            "name": post.author.name,
            "email": post.author.email,
        }

    return {
        "id": post.id,
        "title": post.title,
        "slug": post.slug,
        "content": post.content,
        "image": post.image,
        "status": post.status,
        "tags": post.tags or [],
        "author": author_data,
        "publishedAt": post.published_at,
        "deletedAt": post.deleted_at,
        "createdAt": post.created_at,
        "updatedAt": post.updated_at,
    }


async def _get_active_author(author_id: int, session: AsyncSession) -> AuthorTable:
    result = await session.execute(
        select(AuthorTable).where(
            AuthorTable.id == author_id,
            AuthorTable.status != "deleted",
        )
    )
    author = result.scalar_one_or_none()
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    return author


async def create_post(data: dict, session: AsyncSession) -> dict:
    """Equivalent to createPost() in post.service.ts"""

    if data.get("status") == "deleted":
        raise HTTPException(status_code=400, detail="Cannot create a post with status 'deleted'")

    # Duplicate slug check
    slug = data.get("slug", "").strip().lower()
    result = await session.execute(select(PostTable).where(PostTable.slug == slug))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Slug already in use")

    now = datetime.now(timezone.utc)
    status = data.get("status", "draft")
    await _get_active_author(data["author"], session)

    post = PostTable(
        title=data["title"],
        slug=slug,
        content=data["content"],
        image=(data.get("image") or "").strip() or DEFAULT_POST_IMAGE,
        author_id=data["author"],
        status=status,
        published_at=now if status == "published" else None,
        deleted_at=None,
        tags=data.get("tags", []),
        created_at=now,
        updated_at=now,
    )
    session.add(post)
    await session.flush()

    # Reload with joined author
    result = await session.execute(
        select(PostTable)
        .options(joinedload(PostTable.author))
        .where(PostTable.id == post.id)
    )
    post = result.scalar_one()

    return _post_to_dict(post)


async def get_posts(query_params: dict, session: AsyncSession) -> dict:
    """
    Equivalent to getPosts() in post.service.ts.
    Supports filter, search, sort, paginate + author populate.
    """
    # Support authorId as alias for author
    if query_params.get("authorId") and not query_params.get("author"):
        query_params["author"] = query_params.pop("authorId")
    else:
        query_params.pop("authorId", None)

    # Rename "author" filter to "author_id" for the DB column
    if "author" in query_params:
        try:
            query_params["author_id"] = int(query_params.pop("author"))
        except (ValueError, TypeError):
            query_params.pop("author", None)

    features = (
        ApiFeatures(PostTable, query_params)
        .filter(["status", "author_id", "tag"])
        .search(["title", "content", "slug"])
        .sort("-created_at")
        .paginate(10, 100)
        .add_where(PostTable.status != "deleted")
        .add_options(joinedload(PostTable.author))
    )

    total, posts = await features.execute(session)
    serialized = [_post_to_dict(p) for p in posts]

    return {
        "page": features.page,
        "limit": features.limit,
        "total": total,
        "totalPages": max(1, -(-total // features.limit)),
        "results": len(serialized),
        "data": serialized,
    }


async def get_post_by_id(id: int, session: AsyncSession) -> dict:
    """Equivalent to getPostById() in post.service.ts"""

    result = await session.execute(
        select(PostTable)
        .options(joinedload(PostTable.author))
        .where(PostTable.id == id, PostTable.status != "deleted")
    )
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    return _post_to_dict(post)


async def update_post(id: int, data: dict, session: AsyncSession) -> dict:
    """Equivalent to updatePost() in post.service.ts"""

    result = await session.execute(
        select(PostTable)
        .options(joinedload(PostTable.author))
        .where(PostTable.id == id, PostTable.status != "deleted")
    )
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    update_data = {k: v for k, v in data.items() if v is not None}

    if "image" in update_data:
        update_data["image"] = (update_data["image"] or "").strip() or DEFAULT_POST_IMAGE

    # Rename "author" to "author_id"
    if "author" in update_data:
        await _get_active_author(update_data["author"], session)
        update_data["author_id"] = update_data.pop("author")

    # Manage publishedAt / deletedAt based on status change
    status = update_data.get("status")
    now = datetime.now(timezone.utc)
    if status == "deleted":
        update_data["deleted_at"] = now
        update_data["published_at"] = None
    elif status == "published":
        update_data["published_at"] = now
        update_data["deleted_at"] = None
    elif status == "draft":
        update_data["published_at"] = None
        update_data["deleted_at"] = None

    # Apply updates to the ORM object
    for key, value in update_data.items():
        col_name = key
        # Map camelCase keys from Pydantic to snake_case columns
        if key == "publishedAt":
            col_name = "published_at"
        elif key == "deletedAt":
            col_name = "deleted_at"
        if hasattr(post, col_name):
            setattr(post, col_name, value)

    post.updated_at = now
    await session.flush()

    # Reload with author
    result = await session.execute(
        select(PostTable)
        .options(joinedload(PostTable.author))
        .where(PostTable.id == id)
    )
    post = result.scalar_one()

    return _post_to_dict(post)


async def delete_post(id: int, session: AsyncSession) -> None:
    """
    Equivalent to deletePost() in post.service.ts.
    Soft delete -- marks status as deleted.
    """
    result = await session.execute(
        select(PostTable).where(PostTable.id == id, PostTable.status != "deleted")
    )
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    post.status = "deleted"
    post.deleted_at = datetime.now(timezone.utc)
    post.published_at = None
    post.updated_at = datetime.now(timezone.utc)
    await session.flush()


async def get_posts_by_author(author_id: int, query_params: dict, session: AsyncSession) -> dict:
    """Equivalent to getPostsByAuthor() in post.service.ts"""

    features = (
        ApiFeatures(PostTable, query_params)
        .filter(["status", "tag"])
        .search(["title", "content", "slug"])
        .sort("-created_at")
        .paginate(10, 100)
        .add_where(PostTable.author_id == author_id, PostTable.status != "deleted")
        .add_options(joinedload(PostTable.author))
    )

    total, posts = await features.execute(session)
    serialized = [_post_to_dict(p) for p in posts]

    return {
        "author": author_id,
        "page": features.page,
        "limit": features.limit,
        "total": total,
        "totalPages": max(1, -(-total // features.limit)),
        "results": len(serialized),
        "data": serialized,
    }
