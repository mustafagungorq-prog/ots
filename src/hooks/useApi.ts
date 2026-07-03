import { useState, useCallback } from 'react';

const pathParts = window.location.pathname.split('/').filter(Boolean);
const appRoot = pathParts.length > 0 ? `/${pathParts[0]}` : '';
const API_BASE = import.meta.env.VITE_API_URL || `${appRoot}/api/index.php`;
const MAIL_PHP_URL = `${appRoot}/api/config/mail.php`;

function getToken(): string | null {
  return localStorage.getItem('ots_token');
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const cleanBase = API_BASE.replace(/\/$/, '');
  const cleanPath = path.replace(/^\//, '');
  const url = `${cleanBase}/${cleanPath}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export function useApiGet<T>(path: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch(path);
      setData(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [path, ...deps]);

  return { data, loading, error, fetchData, setData };
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch(path, { method: 'GET' });
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiFetch(path, { method: 'DELETE' });
}

export async function sendMailViaPhp<T>(body: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(MAIL_PHP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export { apiFetch, getToken };
