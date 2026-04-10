"""
Application entry point.

- Creates the FastAPI app instance
- Registers global middleware (CORS, static files)
- Mounts all routers under /api/auth, /api/authors, /api/posts, /api/users
- Connects to PostgreSQL on startup and disposes cleanly on shutdown
- Seeds sample data only in development
- Provides root ("/") server info and health check ("/health") endpoints
- Handles 404 and global error responses
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from sqlalchemy import text

from config.db import init_db, close_db, async_session_factory
from config.env import settings
from seed.seed import seed

from routers.auth import router as auth_router
from routers.authors import router as authors_router
from routers.posts import router as posts_router
from routers.stats import router as stats_router
from routers.users import router as users_router

# -- App setup ----------------------------------------------------------------

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Manage application startup and shutdown."""
    logger.info("Starting up application")
    await init_db()

    if settings.is_development:
        logger.info("Development mode detected; running seed data")
        await seed()
    else:
        logger.info("Skipping seed data for %s environment", settings.APP_ENV)

    logger.info("Server ready (port %s, env: %s)", settings.PORT, settings.APP_ENV)
    try:
        yield
    finally:
        logger.info("Shutting down application")
        await close_db()

app = FastAPI(
    title="Blog Platform API",
    description="Admin-managed blog REST API — FastAPI + PostgreSQL",
    version="1.0.0",
    lifespan=lifespan,
)

# -- Global Middlewares -------------------------------------------------------

# CORS -- equivalent to app.use(cors())
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- Static files (uploaded images) ------------------------------------------
# Equivalent to: app.use("/uploads", express.static(...))

uploads_path = Path("uploads")
uploads_path.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# -- Root endpoint ------------------------------------------------------------

@app.get("/", tags=["Info"])
async def root():
    """Server info at the root URL."""
    return {
        "name": "Blog Platform API",
        "version": "1.0.0",
        "description": "Admin-managed blog REST API — FastAPI + PostgreSQL",
        "environment": settings.APP_ENV,
        "docs": "/docs",
        "endpoints": {
            "register": "/register",
            "login": "/login",
            "users": "/users",
            "stats_count": "/stats/count",
            "stats_average_age": "/stats/average-age",
            "stats_top_cities": "/stats/top-cities",
            "authors": "/api/authors",
            "posts": "/api/posts",
            "health": "/health",
        },
    }

# -- Health check -------------------------------------------------------------

@app.get("/health", tags=["Health"])
async def health():
    """Check API and database connectivity."""
    db_status = "connected"
    db_error = None

    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "disconnected"
        if not settings.is_production:
            db_error = str(e)

    status_code = 200 if db_status == "connected" else 503
    response = {
        "status": "ok" if db_status == "connected" else "degraded",
        "message": "API is running",
        "database": db_status,
    }
    if db_error:
        response["database_error"] = db_error

    return JSONResponse(status_code=status_code, content=response)

# -- API Routers --------------------------------------------------------------
# Equivalent to: app.use("/api/auth", authRoutes) etc.

app.include_router(auth_router)
app.include_router(authors_router, prefix="/api/authors")
app.include_router(posts_router,   prefix="/api/posts")
app.include_router(users_router)
app.include_router(stats_router)

# -- 404 handler --------------------------------------------------------------
# Equivalent to: app.use((_req, res) => res.status(404).json(...))

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"message": "Route not found"})

# -- Global error handler -----------------------------------------------------
# Equivalent to: app.use(errorHandler)
# FastAPI HTTPException is handled automatically -- this catches unexpected errors.

@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    import logging
    logging.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )
