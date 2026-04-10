# Blog Platform REST API

Admin-managed blog REST API built with **FastAPI** + **PostgreSQL** + **Pydantic v2**.

Supports JWT auth, role-based access, full CRUD for authors & posts, soft deletes, filtering, sorting, pagination, search, and optional Cloudinary image uploads.

---

## Prerequisites

Before running this project, make sure you have:

- **Python 3.10+** installed — [download here](https://www.python.org/downloads/)
- **PostgreSQL** — either:
  - Installed locally — [download here](https://www.postgresql.org/download/)
  - Or a free cloud database — [Neon](https://neon.tech), [Supabase](https://supabase.com), [ElephantSQL](https://www.elephantsql.com)
- **Git** — [download here](https://git-scm.com/downloads)

---

## Getting Started (Step by Step)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd fastapi-blog
```

### 2. Create a virtual environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Create the database in Neon

Use Neon as the database provider instead of creating PostgreSQL locally.

1. Go to the Neon console.
2. Create a new project.
3. Open the project dashboard and copy the connection string.
4. Replace `postgresql://` with `postgresql+asyncpg://` if needed before putting it in `.env`.

### 5. Create your `.env` file

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
PORT=8000
DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:5432/blog_db
JWT_SECRET=generate_a_long_random_string_here
JWT_EXPIRES_IN=7
APP_ENV=development
AUTO_CREATE_TABLES=true
APP_BASE_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173

# Optional: super admin credentials (defaults used if not set)
# SUPER_ADMIN_NAME=Development Super Admin
# SUPER_ADMIN_EMAIL=dev-superadmin@example.com
# SUPER_ADMIN_PASSWORD=your_secure_password

# Optional: Cloudinary for image hosting (falls back to local /uploads/ if not set)
# CLOUDINARY_CLOUD_NAME=your_cloud_name
# CLOUDINARY_API_KEY=your_api_key
# CLOUDINARY_API_SECRET=your_api_secret
# CLOUDINARY_FOLDER=posts
```

> **Important:** The `DATABASE_URL` must start with `postgresql+asyncpg://` (not just `postgresql://`).
>
> **For Neon/cloud:** replace `postgresql://` with `postgresql+asyncpg://` in the connection string they give you.

### 6. Start the server

```bash
uvicorn main:app --reload --port 8000
```

You should see:
```
PostgreSQL connected — tables created
INFO:     Uvicorn running on http://127.0.0.1:8000
```

Tables are **auto-created** on first startup in development, and seed data runs automatically only in `development`.

### 7. Open the API docs

Go to **http://localhost:8000/docs** in your browser — this is the interactive Swagger UI where you can test every endpoint.

---

## Default Super Admin Account

On first startup, this account is created automatically:

| Field    | Value                  |
|----------|------------------------|
| Email    | dev-superadmin@example.com |
| Password | change-me-in-env       |
| Role     | super_admin            |

Override these via `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` in your `.env`.

## Production Notes

- Set `APP_ENV=production` in production deployments.
- Set `AUTO_CREATE_TABLES=false` in production and run Alembic migrations during deploy.
- Set `APP_BASE_URL` to your real backend URL in production.
- Set `CORS_ORIGINS` to your real frontend domains, comma-separated.
- Seed data does not run automatically outside `development`.
- Do not deploy with default super admin credentials or placeholder secrets.
- If you do not configure Cloudinary, uploaded files are only suitable for local development.

## Database Migrations

This project now includes Alembic for production-safe schema changes.

Create or apply migrations with:

```bash
alembic upgrade head
```

Alembic uses a synchronous PostgreSQL driver internally, while the app still uses `asyncpg` at runtime.

For local development, the app still auto-creates tables when `APP_ENV=development` or `AUTO_CREATE_TABLES=true`, so a fresh clone can run immediately without manual migration steps.

## Deployment

### Production environment values

Use values like these in production:

```env
APP_ENV=production
AUTO_CREATE_TABLES=false
APP_BASE_URL=https://api.your-backend.com
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET=your_real_secret
CORS_ORIGINS=https://your-frontend.com,https://www.your-frontend.com
```

### Production startup

For production, this repo includes [start.sh](/c:/Users/CLICK%20ONCE/OneDrive/%D8%B3%D8%B7%D8%AD%20%D8%A7%D9%84%D9%85%D9%83%D8%AA%D8%A8/Courses/projects/fastapi-blog/start.sh), which:

1. Runs `alembic upgrade head`
2. Starts `uvicorn`

### Render / Railway

- [Procfile](/c:/Users/CLICK%20ONCE/OneDrive/%D8%B3%D8%B7%D8%AD%20%D8%A7%D9%84%D9%85%D9%83%D8%AA%D8%A8/Courses/projects/fastapi-blog/Procfile) is included for simple platform startup.
- [render.yaml](/c:/Users/CLICK%20ONCE/OneDrive/%D8%B3%D8%B7%D8%AD%20%D8%A7%D9%84%D9%85%D9%83%D8%AA%D8%A8/Courses/projects/fastapi-blog/render.yaml) provides a basic Render service definition.
- On Railway or similar platforms, the start command can be:

```bash
sh start.sh
```

### Docker

Build and run:

```bash
docker build -t fastapi-blog .
docker run --env-file .env -p 8000:8000 fastapi-blog
```

---

## API Endpoints

### Server Info & Health
| Method | URL       | Description                    | Auth |
|--------|-----------|--------------------------------|------|
| GET    | `/`       | Server info & available routes | No   |
| GET    | `/health` | Health check + DB status       | No   |
| GET    | `/docs`   | Swagger UI (interactive docs)  | No   |

### Auth
| Method | URL                   | Description       | Auth |
|--------|-----------------------|-------------------|------|
| POST   | `/api/auth/register`  | Create new admin  | No   |
| POST   | `/api/auth/login`     | Login, get JWT    | No   |

### Authors (requires JWT)
| Method | URL                  | Description          | Role  |
|--------|----------------------|----------------------|-------|
| POST   | `/api/authors`       | Create author        | admin |
| GET    | `/api/authors`       | List authors         | any   |
| GET    | `/api/authors/:id`   | Get author by ID     | any   |
| PATCH  | `/api/authors/:id`   | Update author        | admin |
| DELETE | `/api/authors/:id`   | Soft delete author   | admin |

### Posts (requires JWT)
| Method | URL                            | Description              | Role  |
|--------|--------------------------------|--------------------------|-------|
| POST   | `/api/posts`                   | Create post (multipart)  | admin |
| POST   | `/api/posts/json`              | Create post (JSON body)  | admin |
| GET    | `/api/posts`                   | List posts               | any   |
| GET    | `/api/posts/:id`               | Get post by ID           | any   |
| PATCH  | `/api/posts/:id`               | Update post              | admin |
| DELETE | `/api/posts/:id`               | Soft delete post         | admin |
| GET    | `/api/posts/author/:authorId`  | Posts by author          | any   |

### Users (requires super_admin)
| Method | URL                     | Description        | Role        |
|--------|-------------------------|--------------------|-------------|
| GET    | `/api/users`            | List admin users   | super_admin |
| PATCH  | `/api/users/:id`        | Deactivate user    | super_admin |
| PATCH  | `/api/users/:id/role`   | Update user role   | super_admin |

---

## Query Parameters

All list endpoints support:

```
?page=1&limit=10          # Pagination
?sort=createdAt&order=desc # Sorting (asc or desc)
?q=search_term             # Search across text fields
```

Posts also support:
```
?status=published          # Filter by status
?tag=javascript            # Filter by tag
?author=1                  # Filter by author ID
```

---

## Project Structure

```
fastapi-blog/
├── main.py                    # App entry point: startup, middleware, routers, error handlers
├── requirements.txt           # Python dependencies
├── .env.example               # Environment variable template
├── .gitignore                 # Git ignore rules
│
├── config/
│   ├── env.py                 # Loads environment variables into a Settings class
│   └── db.py                  # SQLAlchemy async engine, session factory, table creation
│
├── models/
│   ├── tables.py              # SQLAlchemy ORM models (UserTable, AuthorTable, PostTable)
│   ├── user.py                # Pydantic schemas for user requests & responses
│   ├── author.py              # Pydantic schemas for author requests & responses
│   └── post.py                # Pydantic schemas for post requests & responses
│
├── services/
│   ├── auth_service.py        # Register, login, password hashing, JWT token creation
│   ├── author_service.py      # Author CRUD, soft delete, duplicate email check
│   ├── post_service.py        # Post CRUD, slug validation, author join, soft delete
│   └── user_service.py        # List users, deactivate, update role (admin dashboard)
│
├── routers/
│   ├── auth.py                # POST /api/auth/register, /api/auth/login
│   ├── authors.py             # CRUD endpoints for /api/authors
│   ├── posts.py               # CRUD endpoints for /api/posts + image upload
│   └── users.py               # Admin endpoints for /api/users (super_admin only)
│
├── middlewares/
│   └── auth.py                # JWT verification, role guards (protect, admin_only, super_admin_only)
│
├── utils/
│   └── api_features.py        # Reusable query builder: filter, search, sort, paginate
│
├── seed/
│   └── seed.py                # Seeds sample data in development (idempotent)
│
└── uploads/                   # Local image storage (when Cloudinary is not configured)
```

---

## Tech Stack

| Technology     | Purpose                      |
|---------------|------------------------------|
| FastAPI        | Web framework                |
| SQLAlchemy 2.0 | Async ORM for PostgreSQL     |
| asyncpg        | PostgreSQL async driver      |
| Pydantic v2    | Request/response validation  |
| python-jose    | JWT token creation & verify  |
| bcrypt         | Password hashing             |
| Cloudinary     | Optional image hosting       |
| Uvicorn        | ASGI server                  |
