import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StudentsPage } from '@/app/pages/StudentsPage';

const navigateMock = vi.fn();

const studentData = {
  students: [
    {
      id: 1,
      firstName: 'Ali',
      lastName: 'Yılmaz',
      city: 'Konya',
      grade: '6. Sınıf',
      parentName: 'Veli Yılmaz',
      lessons: [11],
      schoolId: 2,
      age: 12,
      groupId: 3,
    },
    {
      id: 2,
      firstName: 'Ayşe',
      lastName: 'Kaya',
      city: 'Sivas',
      grade: '5. Sınıf',
      parentName: 'Mehmet Kaya',
      lessons: [],
      schoolId: 2,
      age: 11,
      groupId: null,
    },
  ],
  schools: [{ id: 2, name: 'Merkez Medrese' }],
  lessons: [{ id: 11, name: 'Tecvid' }],
  classRooms: [{ id: 3, name: '6-A', grade: '6. Sınıf', active: true, lessonIds: [11] }],
  deleteStudent: vi.fn(),
  updateStudent: vi.fn(),
};

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    canViewColumn: vi.fn(() => true),
    canCreate: true,
    canEdit: true,
    canDelete: true,
  }),
}));

vi.mock('@/hooks/useStudentData', () => ({
  useStudentData: () => studentData,
}));

describe('StudentsPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    studentData.deleteStudent.mockClear();
    studentData.updateStudent.mockClear();
  });

  it('renders the student list and group badge', () => {
    render(<StudentsPage />);

    expect(screen.getByText('Ali Yılmaz')).toBeTruthy();
    expect(screen.getAllByText('Merkez Medrese')[0]).toBeTruthy();
    expect(screen.getByText('6-A')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ekle/i })).toBeTruthy();
  });

  it('filters the list by search text', () => {
    render(<StudentsPage />);

    const searchInput = document.querySelector('input[placeholder="Ara..."]') as HTMLInputElement | null;
    expect(searchInput).toBeTruthy();

    fireEvent.change(searchInput!, { target: { value: 'Ayşe' } });

    expect(screen.getAllByText('Ayşe Kaya')[0]).toBeTruthy();
  });

  it('shows the bulk transfer action after selecting a student', () => {
    render(<StudentsPage />);

    fireEvent.click(screen.getAllByRole('checkbox')[0]);

    expect(screen.getByRole('button', { name: /1 Öğrenciyi Gruba Aktar/i })).toBeTruthy();
  });
});