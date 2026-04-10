"""
Reusable query builder for paginated list endpoints.

Wraps SQLAlchemy select statements with chainable methods:
  .filter(["status", "tag"])       — exact-match WHERE clauses from query params
  .search(["title", "content"])    — ILIKE search across multiple text columns
  .sort("-created_at")             — ORDER BY with camelCase → snake_case mapping
  .paginate(default_limit, max)    — OFFSET / LIMIT from ?page= and ?limit=
  .add_where(condition)            — add arbitrary WHERE clauses
  .add_options(joinedload(...))    — add eager-loading options
  .execute(session)                — runs count + data queries, returns (total, rows)
"""

import re
from typing import Any, Dict, List, Type

from sqlalchemy import select, func, or_, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import QueryableAttribute


def _camel_to_snake(name: str) -> str:
    """Convert camelCase to snake_case: createdAt -> created_at"""
    s1 = re.sub(r"([A-Z])", r"_\1", name)
    return s1.lower().lstrip("_")


class ApiFeatures:
    """
    Builds SQLAlchemy async queries from request query params.

    Usage:
        features = ApiFeatures(PostTable, query_params)
        features.filter(["status", "tag"]).search(["title"]).sort().paginate()
        total, rows = await features.execute(session)
    """

    def __init__(self, model_class: Type, req_query: Dict[str, Any]):
        self.model = model_class
        self.req_query = req_query

        self.stmt = select(model_class)
        self.count_stmt = select(func.count(distinct(model_class.id))).select_from(model_class)

        self.page: int = 1
        self.limit: int = 10

    # ── Helpers to add arbitrary WHERE clauses ──────────────────────────

    def add_where(self, *conditions):
        """Add arbitrary WHERE conditions to both data and count queries."""
        for cond in conditions:
            self.stmt = self.stmt.where(cond)
            self.count_stmt = self.count_stmt.where(cond)
        return self

    def add_options(self, *options):
        """Add query options like joinedload."""
        self.stmt = self.stmt.options(*options)
        return self

    # ── Filter ──────────────────────────────────────────────────────────

    def filter(self, allowed_fields: List[str] = []):
        """
        Picks only allowed query params and maps them to WHERE clauses.
        """
        q = dict(self.req_query)

        # Remove non-filter keys
        for key in ["page", "limit", "sort", "order", "q"]:
            q.pop(key, None)

        # Keep only allowed fields
        if allowed_fields:
            q = {k: v for k, v in q.items() if k in allowed_fields}

        # Special case: tag → filter posts by tag in ARRAY column
        if "tag" in q:
            tag_val = q.pop("tag")
            col = getattr(self.model, "tags", None)
            if col is not None:
                cond = col.any(tag_val)
                self.stmt = self.stmt.where(cond)
                self.count_stmt = self.count_stmt.where(cond)

        # Map camelCase filter keys to snake_case columns
        for field, value in q.items():
            col_name = _camel_to_snake(field)
            col = getattr(self.model, col_name, None)
            if col is None:
                # Try original name (already snake_case)
                col = getattr(self.model, field, None)
            if col is not None and isinstance(col, QueryableAttribute):
                cond = col == value
                self.stmt = self.stmt.where(cond)
                self.count_stmt = self.count_stmt.where(cond)

        return self

    # ── Search ──────────────────────────────────────────────────────────

    def search(self, fields: List[str] = []):
        """
        Adds ILIKE search across multiple fields (replaces $or + $regex).
        """
        q = str(self.req_query.get("q", "") or "").strip()
        if q and fields:
            conditions = []
            for field_name in fields:
                col_name = _camel_to_snake(field_name)
                col = getattr(self.model, col_name, None)
                if col is None:
                    col = getattr(self.model, field_name, None)
                if col is not None and isinstance(col, QueryableAttribute):
                    conditions.append(col.ilike(f"%{q}%"))
            if conditions:
                combined = or_(*conditions)
                self.stmt = self.stmt.where(combined)
                self.count_stmt = self.count_stmt.where(combined)
        return self

    # ── Sort ────────────────────────────────────────────────────────────

    def sort(self, default_sort: str = "-created_at"):
        """
        Adds ORDER BY clause. Supports ?sort=createdAt&order=asc|desc
        """
        sort_param = str(self.req_query.get("sort", "") or "").strip()
        order_param = str(self.req_query.get("order", "desc") or "desc").strip().lower()

        if sort_param:
            col_name = _camel_to_snake(sort_param)
            order_dir = "asc" if order_param == "asc" else "desc"
        else:
            if default_sort.startswith("-"):
                col_name = _camel_to_snake(default_sort[1:])
                order_dir = "desc"
            else:
                col_name = _camel_to_snake(default_sort)
                order_dir = "asc"

        col = getattr(self.model, col_name, None)
        if col is not None and isinstance(col, QueryableAttribute):
            self.stmt = self.stmt.order_by(
                col.asc() if order_dir == "asc" else col.desc()
            )
        return self

    # ── Paginate ────────────────────────────────────────────────────────

    def paginate(self, default_limit: int = 10, max_limit: int = 100):
        """
        Adds OFFSET / LIMIT. Reads ?page= and ?limit= from query.
        """
        self.page = max(int(self.req_query.get("page", 1) or 1), 1)
        self.limit = min(
            max(int(self.req_query.get("limit", default_limit) or default_limit), 1),
            max_limit,
        )
        skip = (self.page - 1) * self.limit
        self.stmt = self.stmt.offset(skip).limit(self.limit)
        return self

    # ── Execute ─────────────────────────────────────────────────────────

    async def execute(self, session: AsyncSession):
        """
        Run count + data queries and return (total, rows).
        """
        # Count (without joins / offset / limit)
        count_result = await session.execute(self.count_stmt)
        total = count_result.scalar() or 0

        # Data
        result = await session.execute(self.stmt)
        rows = result.scalars().unique().all()

        return total, rows
