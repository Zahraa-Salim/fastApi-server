"""
Posts router — CRUD endpoints for blog posts.

POST   /api/posts            — create post with image upload (multipart/form-data, admin only)
POST   /api/posts/json       — create post without image (JSON body, admin only)
GET    /api/posts            — list posts with filter/search/sort/pagination
GET    /api/posts/:id        — get single post by ID (with author data)
PATCH  /api/posts/:id        — update post (admin only)
DELETE /api/posts/:id        — soft delete post (admin only)
GET    /api/posts/author/:id — list posts by a specific author

Image upload: uses Cloudinary if configured, otherwise saves to local /uploads/posts/.
All endpoints require JWT authentication (protect middleware).
"""

import os
import shutil
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from config.db import get_session
from config.env import settings
from middlewares.auth import protect, admin_only
from models.post import PostCreate, PostUpdate
import services.post_service as post_service

UPLOADS_DIR = Path("uploads/posts")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(tags=["Posts"], dependencies=[Depends(protect)])


def _is_cloudinary_configured() -> bool:
    return all([
        os.getenv("CLOUDINARY_CLOUD_NAME"),
        os.getenv("CLOUDINARY_API_KEY"),
        os.getenv("CLOUDINARY_API_SECRET"),
    ])


async def _handle_upload(file: Optional[UploadFile], request_base: str) -> Optional[str]:
    """
    Equivalent to the multer + cloudinary logic in post.controller.ts.
    Returns image URL (cloudinary or local).
    """
    if not file:
        return None

    if not file.content_type.startswith("image/"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    if _is_cloudinary_configured():
        import cloudinary.uploader
        folder = os.getenv("CLOUDINARY_FOLDER", "posts")
        result = cloudinary.uploader.upload(file.file, folder=folder, resource_type="image")
        return result["secure_url"]
    else:
        if settings.is_production:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=503,
                detail="Local file uploads are disabled in production. Configure Cloudinary instead.",
            )
        # Save locally
        ext = Path(file.filename).suffix.lower() or ".jpg"
        filename = f"{int(datetime.now().timestamp() * 1000)}{ext}"
        dest = UPLOADS_DIR / filename
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)
        return f"{request_base}/uploads/posts/{filename}"


@router.post("/", status_code=201)
async def create_post(
    # Form fields -- needed when accepting multipart (like multer in Express)
    title: str = Form(...),
    slug: str = Form(...),
    content: str = Form(...),
    author: int = Form(...),
    status: Optional[str] = Form("draft"),
    tags: Optional[str] = Form(None),   # comma-separated string
    image: Optional[UploadFile] = File(None),
    user: dict = Depends(admin_only),
    session: AsyncSession = Depends(get_session),
):
    """
    Equivalent to: POST /api/posts
    Accepts multipart/form-data (for image upload) or JSON.
    """
    # Parse tags from comma-separated string
    parsed_tags = [t.strip() for t in tags.split(",")] if tags else []

    # Validate body with Pydantic manually (because Form + Pydantic body don't mix)
    body = PostCreate(
        title=title, slug=slug, content=content,
        author=author, status=status, tags=parsed_tags,
    )

    payload = body.model_dump()
    # Image upload handled separately
    image_url = await _handle_upload(image, settings.effective_base_url)
    if image_url:
        payload["image"] = image_url

    post = await post_service.create_post(payload, session)
    return {"data": post}


@router.post("/json", status_code=201)
async def create_post_json(
    body: PostCreate,
    user: dict = Depends(admin_only),
    session: AsyncSession = Depends(get_session),
):
    """
    JSON-only variant (no file upload).
    Easier to use from Postman or frontend fetch with JSON.
    """
    post = await post_service.create_post(body.model_dump(), session)
    return {"data": post}


@router.get("/")
async def get_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    author: Optional[int] = None,
    authorId: Optional[int] = None,
    tag: Optional[str] = None,
    sort: Optional[str] = None,
    order: Optional[str] = Query("desc", pattern="^(asc|desc)$"),
    q: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    """Equivalent to: GET /api/posts with full filtering"""
    query_params = {
        "page": page, "limit": limit, "status": status,
        "author": author, "authorId": authorId, "tag": tag,
        "sort": sort, "order": order, "q": q,
    }
    # Remove None values
    query_params = {k: v for k, v in query_params.items() if v is not None}
    return await post_service.get_posts(query_params, session)


@router.get("/author/{author_id}")
async def get_posts_by_author(
    author_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort: Optional[str] = None,
    order: Optional[str] = Query("desc", pattern="^(asc|desc)$"),
    q: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    """Equivalent to: GET /api/posts/author/:authorId"""
    query_params = {
        "page": page, "limit": limit,
        "sort": sort, "order": order, "q": q,
    }
    return await post_service.get_posts_by_author(author_id, query_params, session)


@router.get("/{id}")
async def get_post(id: int, session: AsyncSession = Depends(get_session)):
    """Equivalent to: GET /api/posts/:id"""
    post = await post_service.get_post_by_id(id, session)
    return {"data": post}


@router.patch("/{id}")
async def update_post(
    id: int,
    body: PostUpdate,
    user: dict = Depends(admin_only),
    session: AsyncSession = Depends(get_session),
):
    """Equivalent to: PATCH /api/posts/:id"""
    post = await post_service.update_post(id, body.model_dump(), session)
    return {"data": post}


@router.delete("/{id}", status_code=204)
async def delete_post(
    id: int,
    user: dict = Depends(admin_only),
    session: AsyncSession = Depends(get_session),
):
    """Equivalent to: DELETE /api/posts/:id (soft delete)"""
    await post_service.delete_post(id, session)
