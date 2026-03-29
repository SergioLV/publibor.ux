import { apiFetch } from '../../../shared/api';
import type { AuthUser } from '../model/types';

const TOKEN_KEY = 'raffer-token';
const TOKEN_EXPIRES_KEY = 'raffer-token-expires';

/** Extract tenant slug from subdomain (e.g. publibor.raffer.cl → publibor) */
export function getTenantSlug(): string {
  const host = window.location.hostname;
  const parts = host.split('.');
  if (parts.length >= 3) return parts[0];
  return localStorage.getItem('raffer-tenant') || 'publibor';
}

export function getAuthToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expires = localStorage.getItem(TOKEN_EXPIRES_KEY);
  if (!token || !expires) return null;
  if (new Date(expires) <= new Date()) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRES_KEY);
    return null;
  }
  return token;
}

export function setAuthToken(token: string, expiresAt: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRES_KEY);
}

export async function apiLogin(username: string, password: string): Promise<{ token: string; expires_at: string }> {
  const res = await apiFetch<{ data: { token: string; expires_at: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ tenant: getTenantSlug(), username, password }),
  });
  return res.data;
}

export async function apiGetMe(): Promise<AuthUser> {
  const res = await apiFetch<{ data: AuthUser }>('/auth/me');
  return res.data;
}
