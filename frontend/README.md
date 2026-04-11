# Verdant Blog — Frontend

React + Vite + TypeScript frontend for the Verdant Blog platform.
Includes an admin dashboard and a client-facing posts area.

## Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Default API URL:

```env
VITE_API_URL=http://localhost:8000
```

## Install and Run

```bash
npm install
npm run dev
```

Open the Vite URL shown in terminal (usually `http://localhost:5173`).

## Build

```bash
npm run build
```

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `saraKhalil@example.com` | `password123` |
| Client | `a@a.com` | `password123` |

## Auth & Roles

After login the server returns a `type` field on the user object:

- `"client"` → redirected to `/dashboard`
- `"admin"` → redirected to `/client`

Admins can create new users with either type from the Users page.

## Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/login` | Public | Login for both admin and client |
| `/register` | Public | Register a new account |
| `/dashboard/users` | Admin only | Manage users (list, create, delete) |
| `/dashboard/authors` | Admin only | Manage authors (CRUD) |
| `/dashboard/posts` | Admin only | Manage posts (CRUD + filters) |
| `/client/posts` | Client only | Browse published posts |
| `/client/profile` | Client only | View personal profile |

## Features

- JWT auth stored in localStorage
- Role-based routing: admin → `/dashboard`, client → `/client`
- Protected routes with automatic redirect based on user type
- **Admin:** Users management (list, create, delete), Authors CRUD, Posts CRUD
- **Client:** Read-only published posts feed with search and pagination
- Client profile page showing account details
- Pagination, sorting, and debounced search
- Responsive layout — mobile sidebar drawer for admin, clean navbar for client
- Framer Motion page transitions
- Form validation with `react-hook-form` + `zod`
- Toast notifications with `react-hot-toast`
- Dark mode support

## Source Structure

```text
src/
  app/
    App.tsx
    routes.tsx
  components/
    layout/
      DashboardLayout.tsx
      Sidebar.tsx
    ui/
      Button.tsx
      Input.tsx
      Select.tsx
      Modal.tsx
      Table.tsx
      Pagination.tsx
      Spinner.tsx
      EmptyState.tsx
  pages/
    auth/
      LoginPage.tsx
      RegisterPage.tsx
    dashboard/
      UsersPage.tsx
      AuthorsPage.tsx
      PostsPage.tsx
    client/
      ClientPostsPage.tsx
      ClientProfilePage.tsx
  lib/
    api.ts
    auth.ts
    query.ts
  hooks/
    useDebounce.ts
  types/
    api.ts
  styles/
    globals.css
  main.tsx
```