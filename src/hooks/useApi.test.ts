import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { apiGet, apiPost, useApiGet } from './useApi';

describe('useApi helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('apiGet calls fetch with default headers', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1 }],
    } as Response);

    const data = await apiGet<{ id: number }[]>('students');

    expect(data).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/index.php/students',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('apiPost serializes body and sends auth token when present', async () => {
    localStorage.setItem('ots_token', 'test-token');

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await apiPost('students', { firstName: 'Ali' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/index.php/students',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ firstName: 'Ali' }),
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('throws api error message on non-ok response', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response);

    await expect(apiGet('students')).rejects.toThrow('Unauthorized');
  });
});

describe('useApiGet', () => {
  it('updates data and loading state after successful fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response),
    );

    const { result } = renderHook(() => useApiGet<{ ok: boolean }>('status'));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();

    await act(async () => {
      await result.current.fetchData();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual({ ok: true });
  });
});
