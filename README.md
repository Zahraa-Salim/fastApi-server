# Verdant Blog — Platform

Full-stack blog platform built with **FastAPI** + **PostgreSQL** + **React + Vite**.

The backend is a REST API with JWT auth, role-based access, full CRUD for authors & posts, soft deletes, filtering, sorting, pagination, search, and optional Cloudinary image uploads.

The frontend lives in the `frontend/` folder and includes an admin dashboard and a client-facing posts area.

---

## Project Structure (Top Level)

```
verdant-blog/
├── frontend/        # React + Vite + TypeScript client
├── main.py          # FastAPI app entry point
├── requirements.txt
├── .env.example
├── start.sh
└── ...
```

---

## Test Credentials

| Role   | Email                    | Password      |
|--------|--------------------------|---------------|
| client  | `saraKhalil@example.com` | `password123` |
| admin | `a@a.com`                | `password123` |

The default super admin account is created automatically on first startup in development:

| Field    | Value                        |
|----------|------------------------------|
| Email    | `dev-superadmin@example.com` |
| Password | `change-me-in-env`           |

Override via `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in your `.env`.

---

## Prerequisites

- **Python 3.10+** — [download](https://www.python.org/downloads/)
- **Node.js 18+** — [download](https://nodejs.org/)
- **PostgreSQL** — local or cloud ([Neon](https://neon.tech), [Supabase](https://supabase.com))
- **Git** — [download](https://git-scm.com/downloads)

---

## Backend Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd verdant-blog
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

### 4. Create your `.env` file

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


```

> **Important:** `DATABASE_URL` must start with `postgresql+asyncpg://` not `postgresql://`.
> For Neon: replace `postgresql://` with `postgresql+asyncpg://` and replace `?sslmode=require` with `?ssl=require`.

### 5. Start the server

```bash
uvicorn main:app --reload --port 8000
```

You should see:

```
PostgreSQL connected — tables created
INFO:     Uvicorn running on http://127.0.0.1:8000
```

Tables are auto-created on first startup in development, and seed data runs automatically.

### 6. Open the API docs

Go to **http://localhost:8000/docs** — interactive Swagger UI to test every endpoint.

---

## Frontend Setup

```bash
cd frontend
cp .env.example .env   # or create .env manually
npm install
npm run dev
```

The frontend `.env`:

```env
VITE_API_URL=http://localhost:8000
```

Open **http://localhost:5173** in your browser.

### Frontend Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/login` | Public | Login for admin and client |
| `/register` | Public | Register a new account |
| `/dashboard/users` | Admin only | Manage users (list, create, delete) |
| `/dashboard/authors` | Admin only | Manage authors (CRUD) |
| `/dashboard/posts` | Admin only | Manage posts (CRUD + filters) |
| `/client/posts` | Client only | Browse published posts |
| `/client/profile` | Client only | View personal profile |

---

## API Endpoints

### Server Info & Health

| Method | URL       | Description                    | Auth |
|--------|-----------|--------------------------------|------|
| GET    | `/`       | Server info & available routes | No   |
| GET    | `/health` | Health check + DB status       | No   |
| GET    | `/docs`   | Swagger UI                     | No   |

### Auth

| Method | URL                  | Description    | Auth |
|--------|----------------------|----------------|------|
| POST   | `/api/auth/register` | Register user  | No   |
| POST   | `/api/auth/login`    | Login, get JWT | No   |

### Users (requires JWT)

| Method | URL          | Description      | Role  |
|--------|--------------|------------------|-------|
| GET    | `/me`        | Get current user | any   |
| GET    | `/users`     | List all users   | admin |
| PUT    | `/users/:id` | Update user      | admin |
| DELETE | `/users/:id` | Delete user      | admin |

### Authors (requires JWT)

| Method | URL                | Description        | Role  |
|--------|--------------------|--------------------|-------|
| POST   | `/api/authors`     | Create author      | admin |
| GET    | `/api/authors`     | List authors       | any   |
| GET    | `/api/authors/:id` | Get author by ID   | any   |
| PATCH  | `/api/authors/:id` | Update author      | admin |
| DELETE | `/api/authors/:id` | Soft delete author | admin |

### Posts (requires JWT)

| Method | URL                           | Description             | Role  |
|--------|-------------------------------|-------------------------|-------|
| POST   | `/api/posts`                  | Create post (multipart) | admin |
| POST   | `/api/posts/json`             | Create post (JSON)      | admin |
| GET    | `/api/posts`                  | List posts              | any   |
| GET    | `/api/posts/:id`              | Get post by ID          | any   |
| PATCH  | `/api/posts/:id`              | Update post             | admin |
| DELETE | `/api/posts/:id`              | Soft delete post        | admin |
| GET    | `/api/posts/author/:authorId` | Posts by author         | any   |

---

## Query Parameters

All list endpoints support:

```
?page=1&limit=10             # Pagination
?sort=created_at&order=desc  # Sorting (asc or desc)
?q=search_term               # Search across text fields
```

Posts also support:

```
?status=published   # Filter by status
?tag=javascript     # Filter by tag
?author=1           # Filter by author ID
```

---

## Database Migrations

```bash
alembic upgrade head
```

For local development, tables are auto-created when `APP_ENV=development` or `AUTO_CREATE_TABLES=true`.

---

## Production Notes

- Set `APP_ENV=production`
- Set `AUTO_CREATE_TABLES=false` and run Alembic migrations during deploy
- Set `APP_BASE_URL` to your real backend URL
- Set `CORS_ORIGINS` to your real frontend domain(s)
- Configure Cloudinary for image uploads (local uploads are disabled in production)
- Do not use default credentials or placeholder secrets

### Production `.env`

```env
APP_ENV=production
AUTO_CREATE_TABLES=false
APP_BASE_URL=https://api.your-backend.com
DATABASE_URL=postgresql+asyncpg://...?ssl=require
JWT_SECRET=your_real_secret
CORS_ORIGINS=https://your-frontend.com
```

### Render / Railway

Start command:

```bash
sh start.sh
```

`start.sh` runs `alembic upgrade head` then starts `uvicorn`.

### Docker

```bash
docker build -t verdant-blog .
docker run --env-file .env -p 8000:8000 verdant-blog
```

---

## Backend Source Structure

```
verdant-blog/
├── main.py                 # App entry point
├── requirements.txt
├── .env.example
├── start.sh
├── frontend/               # React + Vite frontend
│
├── config/
│   ├── env.py              # Environment variables → Settings class
│   └── db.py               # SQLAlchemy async engine & session
│
├── models/
│   ├── tables.py           # ORM models (UserTable, AuthorTable, PostTable)
│   ├── user.py             # Pydantic schemas for users
│   ├── author.py           # Pydantic schemas for authors
│   └── post.py             # Pydantic schemas for posts
│
├── services/
│   ├── auth_service.py     # Register, login, JWT
│   ├── author_service.py   # Author CRUD
│   ├── post_service.py     # Post CRUD + image
│   └── user_service.py     # User management
│
├── routers/
│   ├── auth.py             # /api/auth/*
│   ├── authors.py          # /api/authors/*
│   ├── posts.py            # /api/posts/*
│   └── users.py            # /me, /users/*
│
├── middlewares/
│   └── auth.py             # JWT verification, role guards
│
├── utils/
│   └── api_features.py     # Filter, search, sort, paginate
│
├── seed/
│   └── seed.py             # Dev seed data (idempotent)
│
└── uploads/                # Local image storage (dev only)
```

---

## Tech Stack

| Technology     | Purpose                     |
|----------------|-----------------------------|
| FastAPI        | Web framework               |
| SQLAlchemy 2.0 | Async ORM for PostgreSQL    |
| asyncpg        | PostgreSQL async driver     |
| Pydantic v2    | Request/response validation |
| python-jose    | JWT token creation & verify |
| bcrypt         | Password hashing            |
| Alembic        | Database migrations         |
| Cloudinary     | Optional image hosting      |
| Uvicorn        | ASGI server                 |
| React + Vite   | Frontend framework          |
| TypeScript     | Frontend type safety        |