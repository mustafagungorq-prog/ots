import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useGridColumns } from './useGridColumns';
import { DEFAULT_GRID_COLUMN_PERMISSIONS } from '@/types';

describe('useGridColumns', () => {
  it('loads default permissions when localStorage is empty', () => {
    const { result } = renderHook(() => useGridColumns());

    expect(result.current.permissions).toEqual(DEFAULT_GRID_COLUMN_PERMISSIONS);
  });

  it('returns false for canViewColumn when user role is missing', () => {
    const { result } = renderHook(() => useGridColumns());

    expect(result.current.canViewColumn('students', 'firstName', null)).toBe(false);
  });

  it('returns true for unknown columns by default', () => {
    const { result } = renderHook(() => useGridColumns());

    expect(result.current.canViewColumn('students', 'unknown_column', 'parent')).toBe(true);
  });

  it('updates existing column permissions', () => {
    const { result } = renderHook(() => useGridColumns());

    expect(result.current.canViewColumn('students', 'tcKimlik', 'admin')).toBe(false);

    act(() => {
      result.current.updateColumnPermission('students', 'tcKimlik', ['admin']);
    });

    expect(result.current.canViewColumn('students', 'tcKimlik', 'admin')).toBe(true);
    expect(result.current.canViewColumn('students', 'tcKimlik', 'superadmin')).toBe(false);
  });

  it('resets permissions to defaults', () => {
    const { result } = renderHook(() => useGridColumns());

    act(() => {
      result.current.updateColumnPermission('students', 'tcKimlik', ['admin']);
      result.current.resetToDefaults();
    });

    expect(result.current.permissions).toEqual(DEFAULT_GRID_COLUMN_PERMISSIONS);
  });
});
