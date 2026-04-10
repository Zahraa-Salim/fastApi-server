from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config.env import settings


# ── Engine & Session Factory ────────────────────────────────────────────────

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,

    # FIX: Prevent "connection is closed"
    pool_pre_ping=True,

    # Optional but recommended for stability
    pool_size=5,
    max_overflow=10,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Base class for ORM models ───────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


# ── Session dependency for FastAPI ──────────────────────────────────────────

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            # Explicit close (safe, avoids edge cases)
            await session.close()


# ── Startup / Shutdown ──────────────────────────────────────────────────────

async def init_db():
    import models.tables  # noqa: F401

    async with engine.begin() as conn:
        if settings.should_auto_create_tables:
            await conn.run_sync(Base.metadata.create_all)
            print("PostgreSQL connected — tables created")
        else:
            print("PostgreSQL connected — auto table creation disabled")


async def close_db():
    await engine.dispose()