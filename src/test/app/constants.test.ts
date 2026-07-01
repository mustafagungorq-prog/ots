import { describe, expect, it } from 'vitest';
import { DAYS, PERMISSIONS, ROLE_COLORS, ROLE_LABELS } from '@/app/constants';

describe('app constants', () => {
  it('exports the expected role labels and colors', () => {
    expect(ROLE_LABELS).toEqual({
      superadmin: 'Super Admin',
      admin: 'Admin',
      authorized_teacher: 'Yetkili Öğr.',
      teacher: 'Öğretmen',
      parent: 'Veli',
    });

    expect(ROLE_COLORS).toEqual({
      superadmin: 'bg-red-500',
      admin: 'bg-blue-500',
      authorized_teacher: 'bg-green-500',
      teacher: 'bg-cyan-500',
      parent: 'bg-orange-500',
    });
  });

  it('exports the week day list and permissions object', () => {
    expect(DAYS).toEqual(['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']);
    expect(PERMISSIONS).toMatchObject({
      STUDENT_CREATE: expect.any(Array),
      USER_MANAGE: expect.any(Array),
      REPORT_CREATE: expect.any(Array),
    });
  });
});