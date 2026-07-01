import type { UserRole } from '@/types';
import { PERMISSIONS } from '@/types';

export const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  authorized_teacher: 'Yetkili Öğr.',
  teacher: 'Öğretmen',
  parent: 'Veli',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  superadmin: 'bg-red-500',
  admin: 'bg-blue-500',
  authorized_teacher: 'bg-green-500',
  teacher: 'bg-cyan-500',
  parent: 'bg-orange-500',
};

export { PERMISSIONS };
