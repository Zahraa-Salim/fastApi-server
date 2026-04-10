"""User management and public analytics services."""

from datetime import datetime, timezone
from fastapi import HTTPException
import bcrypt
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.tables import UserTable


def _user_to_dict(user: UserTable) -> dict:
    return {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone_number": user.phone_number,
        "city": user.city,
        "age": user.age,
        "type": user.type,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


async def get_me(user_id: int, session: AsyncSession) -> dict:
    """Get current authenticated user profile."""
    result = await session.execute(
        select(UserTable).where(UserTable.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return _user_to_dict(user)


async def get_users(query_params: dict, session: AsyncSession) -> dict:
    page = max(int(query_params.get("page", 1) or 1), 1)
    limit = min(max(int(query_params.get("limit", 10) or 10), 1), 100)
    q = str(query_params.get("q", "") or "").strip()
    city = str(query_params.get("city", "") or "").strip()
    user_type = str(query_params.get("type", "") or "").strip()
    min_age = query_params.get("min_age")
    max_age = query_params.get("max_age")

    stmt = select(UserTable).where(UserTable.is_active == True)  # noqa: E712
    count_stmt = select(func.count(UserTable.id)).where(UserTable.is_active == True)  # noqa: E712

    if q:
        search = f"%{q}%"
        search_condition = (
            UserTable.first_name.ilike(search)
            | UserTable.last_name.ilike(search)
            | UserTable.email.ilike(search)
        )
        stmt = stmt.where(search_condition)
        count_stmt = count_stmt.where(search_condition)

    if city:
        city_condition = UserTable.city.ilike(f"%{city}%")
        stmt = stmt.where(city_condition)
        count_stmt = count_stmt.where(city_condition)

    if user_type:
        stmt = stmt.where(UserTable.type == user_type)
        count_stmt = count_stmt.where(UserTable.type == user_type)

    if min_age is not None:
        stmt = stmt.where(UserTable.age >= int(min_age))
        count_stmt = count_stmt.where(UserTable.age >= int(min_age))

    if max_age is not None:
        stmt = stmt.where(UserTable.age <= int(max_age))
        count_stmt = count_stmt.where(UserTable.age <= int(max_age))

    stmt = stmt.order_by(UserTable.created_at.desc()).offset((page - 1) * limit).limit(limit)

    total_result = await session.execute(count_stmt)
    total = total_result.scalar() or 0
    result = await session.execute(stmt)
    users = result.scalars().all()
    serialized = [_user_to_dict(u) for u in users]

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "totalPages": max(1, -(-total // limit)),
        "results": len(serialized),
        "data": serialized,
    }


async def update_user(id: int, data: dict, session: AsyncSession) -> dict:
    result = await session.execute(
        select(UserTable).where(UserTable.id == id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if "email" in data:
        duplicate = await session.execute(
            select(UserTable).where(UserTable.email == data["email"], UserTable.id != id)
        )
        if duplicate.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Email already exists")
        user.email = data["email"]

    if "first_name" in data:
        user.first_name = data["first_name"]
    if "last_name" in data:
        user.last_name = data["last_name"]
    if "phone_number" in data:
        user.phone_number = data["phone_number"]
    if "city" in data:
        user.city = data["city"]
    if "age" in data:
        user.age = data["age"]
    if "type" in data:
        user.type = data["type"]
    if "password" in data and data["password"]:
        user.password = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt()).decode()
    
    user.updated_at = datetime.now(timezone.utc)
    await session.flush()
    await session.refresh(user)

    return _user_to_dict(user)


async def delete_user(id: int, session: AsyncSession) -> None:
    result = await session.execute(
        select(UserTable).where(UserTable.id == id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    user.updated_at = datetime.now(timezone.utc)
    await session.flush()


async def get_total_users(session: AsyncSession) -> dict:
    result = await session.execute(select(func.count(UserTable.id)).where(UserTable.is_active == True))  # noqa: E712
    return {"total_users": result.scalar() or 0}


async def get_average_age(session: AsyncSession) -> dict:
    result = await session.execute(select(func.avg(UserTable.age)).where(UserTable.is_active == True))  # noqa: E712
    average_age = result.scalar()
    return {"average_age": round(float(average_age), 2) if average_age is not None else 0}


async def get_top_cities(session: AsyncSession) -> dict:
    result = await session.execute(
        select(UserTable.city, func.count(UserTable.id).label("count"))
        .where(UserTable.is_active == True)  # noqa: E712
        .group_by(UserTable.city)
        .order_by(func.count(UserTable.id).desc(), UserTable.city.asc())
        .limit(3)
    )
    cities = [{"city": city, "count": count} for city, count in result.all()]
    return {"top_cities": cities}
