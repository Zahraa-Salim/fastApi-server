/**
 * Frontend API client module.
 * Centralizes fetch logic, auth header injection, and typed endpoint methods.
 */
import { getToken } from "./auth";
import { buildQueryString } from "./query";
import type { ApiQuery, Author, AuthorPayload, AuthResponse, PaginatedResponse, Post, PostPayload, User } from "../types/api";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  requireAuth = true
): Promise<T> {
  const headers = new Headers(options.headers || {});

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  if (options.body && !headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (requireAuth) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const data = payload as { error?: string; message?: string } | null;
    const message = data?.error || data?.message || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export const api = {
  auth: {
    register: (body: { first_name: string; last_name: string; email: string; phone_number: string; city: string; age: number; password: string }) =>
      request<AuthResponse>("/register", {
        method: "POST",
        body: JSON.stringify(body),
      }, false),

    login: (body: { email: string; password: string }) =>
      request<AuthResponse>("/login", {
        method: "POST",
        body: JSON.stringify(body),
      }, false),
  },

  users: {
    list: (query: ApiQuery) => request<PaginatedResponse<User>>(`/users${buildQueryString(query)}`),

    me: () => request<{ data: User }>("/me"),

    updateMe: (body: {
      first_name?: string;
      last_name?: string;
      phone_number?: string;
      city?: string;
      age?: number;
    }) =>
      request<{ data: User }>("/me", {
        method: "PUT",
        body: JSON.stringify(body),
      }),

    create: async (body: {
      first_name: string;
      last_name: string;
      email: string;
      phone_number: string;
      city: string;
      age: number;
      password: string;
      type: string;
    }) => {
      // Step 1: Create user via register endpoint (type defaults to "client")
      const registerResponse = await request<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          first_name: body.first_name,
          last_name: body.last_name,
          email: body.email,
          phone_number: body.phone_number,
          city: body.city,
          age: body.age,
          password: body.password,
        }),
      }, false);

      const newUser = registerResponse.user;

      // Step 2: If type is "admin", update user type
      if (body.type === "admin") {
        const updated = await request<{ data: User }>(`/users/${newUser.id}`, {
          method: "PUT",
          body: JSON.stringify({ type: "admin" }),
        });
        return updated;
      }

      return { data: newUser };
    },

    delete: (id: number) => request<void>(`/users/${id}`, { method: "DELETE" }),
  },

  authors: {
    list: (query: ApiQuery) =>
      request<PaginatedResponse<Author>>(`/api/authors${buildQueryString(query)}`),

    create: (body: AuthorPayload) =>
      request<{ data: Author }>("/api/authors", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    update: (id: number, body: Partial<AuthorPayload>) =>
      request<{ data: Author }>(`/api/authors/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),

    delete: (id: number) =>
      request<void>(`/api/authors/${id}`, {
        method: "DELETE",
      }),
  },

  posts: {
    list: (query: ApiQuery) => request<PaginatedResponse<Post>>(`/api/posts${buildQueryString(query)}`),

    create: (body: PostPayload | FormData) =>
      request<{ data: Post }>("/api/posts", {
        method: "POST",
        body: body instanceof FormData ? body : JSON.stringify(body),
      }),

    update: (id: number, body: Partial<PostPayload> | FormData) =>
      request<{ data: Post }>(`/api/posts/${id}`, {
        method: "PATCH",
        body: body instanceof FormData ? body : JSON.stringify(body),
      }),

    delete: (id: number) =>
      request<void>(`/api/posts/${id}`, {
        method: "DELETE",
      }),
  },
};
