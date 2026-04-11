/**
 * Shared API type definitions.
 * Declares response models and domain entities used across the frontend codebase.
 */
export type Order = "asc" | "desc";

export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  city: string;
  age: number;
  type: "admin" | "client";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface PaginatedResponse<T> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  results: number;
  data: T[];
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  city: string;
  age: number;
  type: "admin" | "client";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Author {
  id: number;
  name: string;
  email: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthorRef {
  id: number;
  name: string;
  email: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  image?: string;
  status: "draft" | "published" | "deleted";
  tags: string[];
  author_id: number;
  published_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthorPayload {
  name: string;
  email: string;
  bio?: string;
}

export interface PostPayload {
  title: string;
  slug: string;
  content: string;
  status?: "draft" | "published";
  tags?: string[];
  author: number;
  image?: string;
}

export type ApiQuery = Record<string, string | number | undefined | null>;
