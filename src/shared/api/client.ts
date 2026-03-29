const API_BASE = 'https://api.raffer.cl/api';

export { API_BASE };

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('raffer-token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) {
      localStorage.removeItem('raffer-token');
      localStorage.removeItem('raffer-token-expires');
      window.location.reload();
    }
    const body = await res.json().catch(() => null);
    const message = body?.error?.message || body?.message || res.statusText;
    throw new Error(`API ${res.status}: ${message}`);
  }

  return res.json();
}

/** Decode a base64 data+type response into a blob URL */
export function blobUrlFromBase64(data: string, type: string): string {
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type }));
}
