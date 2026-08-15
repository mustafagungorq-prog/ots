import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_GRID_COLUMN_PERMISSIONS } from '@/types';
import type { GridColumnPermission, UserRole } from '@/types';

const STORAGE_KEY = 'ots_grid_columns';

function loadPermissions(): GridColumnPermission[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [...DEFAULT_GRID_COLUMN_PERMISSIONS];
  } catch {
    return [...DEFAULT_GRID_COLUMN_PERMISSIONS];
  }
}

function savePermissions(perms: GridColumnPermission[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));
}

export function useGridColumns() {
  const [permissions, setPermissions] = useState<GridColumnPermission[]>(() => loadPermissions());

  useEffect(() => {
    savePermissions(permissions);
  }, [permissions]);

  const canViewColumn = useCallback((gridId: string, columnKey: string, userRole: UserRole | null | undefined): boolean => {
    if (!userRole) return false;
    const perm = permissions.find(p => p.gridId === gridId && p.columnKey === columnKey);
    if (!perm) return true; // Default: visible
    return perm.allowedRoles.includes(userRole);
  }, [permissions]);

  const updateColumnPermission = useCallback((gridId: string, columnKey: string, allowedRoles: UserRole[]) => {
    setPermissions(prev => {
      const existing = prev.findIndex(p => p.gridId === gridId && p.columnKey === columnKey);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...prev[existing], allowedRoles };
        return updated;
      }
      return prev;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setPermissions([...DEFAULT_GRID_COLUMN_PERMISSIONS]);
  }, []);

  const getColumnsForGrid = useCallback((gridId: string): GridColumnPermission[] => {
    return permissions.filter(p => p.gridId === gridId);
  }, [permissions]);

  return {
    permissions,
    canViewColumn,
    updateColumnPermission,
    resetToDefaults,
    getColumnsForGrid,
  };
}
