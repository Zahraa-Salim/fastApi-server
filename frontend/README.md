# Admin Dashboard Client 

React + Vite + TypeScript admin dashboard for the blog platform API.

## Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Default API URL:

```env
VITE_API_URL=http://localhost:5000
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

## Routes

- `/register`
- `/login`
- `/dashboard/users`
- `/dashboard/authors`
- `/dashboard/posts`

All `/dashboard/*` routes are protected and require JWT from login.

## Features

- JWT auth with localStorage token
- Protected routing
- Users management (list + deactivate)
- Authors CRUD with modal forms
- Posts CRUD with modal forms + filters (`status`, `tag`, `authorId`)
- Pagination, sorting, and debounced search (`q`)
- Custom responsive CSS layout with mobile sidebar drawer toggle
- Framer Motion transitions for routes/modals
- Form validation using `react-hook-form` + `zod`
- Toast notifications using `react-hot-toast`

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
