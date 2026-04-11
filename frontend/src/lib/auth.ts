/**
 * Authentication storage helpers.
 * Reads, writes, clears, and validates JWT token state in localStorage.
 */
import type { AuthUser } from "../types/api";

const TOKEN_KEY = "blog_token";
const USER_KEY = "blog_user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function setAuthUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAuthUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  return getAuthUser()?.type === "admin";
}

export function isClient(): boolean {
  return getAuthUser()?.type === "client";
}
