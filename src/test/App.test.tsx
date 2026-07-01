import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import AppRouter from '@/App';

let authState: {
  currentUser: null | { id: number; role: 'superadmin' | 'admin' | 'authorized_teacher' | 'teacher' | 'parent'; fullName: string };
  hasPermission: ReturnType<typeof vi.fn>;
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('@/app/shell', () => ({
  LoginPage: () => <div>login-page</div>,
  MainLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/app/pages/DashboardPage.tsx', () => ({ DashboardPage: () => <div>dashboard-page</div> }));
vi.mock('@/app/pages/StudentFormPage.tsx', () => ({ StudentFormPage: () => <div>student-form-page</div> }));
vi.mock('@/app/pages/StudentsPage.tsx', () => ({ StudentsPage: () => <div>students-page</div> }));
vi.mock('@/app/pages/SchoolsPage.tsx', () => ({ SchoolsPage: () => <div>schools-page</div> }));
vi.mock('@/app/pages/ClassesPage.tsx', () => ({ ClassesPage: () => <div>classes-page</div> }));
vi.mock('@/app/pages/LessonsPage.tsx', () => ({ LessonsPage: () => <div>lessons-page</div> }));
vi.mock('@/app/pages/AttendancePage.tsx', () => ({ AttendancePage: () => <div>attendance-page</div> }));
vi.mock('@/app/pages/TeacherLessonsPage.tsx', () => ({ TeacherLessonsPage: () => <div>teacher-lessons-page</div> }));
vi.mock('@/app/pages/ProgressPage.tsx', () => ({ ProgressPage: () => <div>progress-page</div> }));
vi.mock('@/app/pages/CommentsPage.tsx', () => ({ CommentsPage: () => <div>comments-page</div> }));
vi.mock('@/app/pages/ReportsPage.tsx', () => ({ ReportsPage: () => <div>reports-page</div> }));
vi.mock('@/app/pages/PermissionsPage.tsx', () => ({ PermissionsPage: () => <div>permissions-page</div> }));
vi.mock('@/app/pages/UsersPage.tsx', () => ({ UsersPage: () => <div>users-page</div> }));
vi.mock('@/app/pages/SurveyManagementPage.tsx', () => ({ SurveyManagementPage: () => <div>surveys-page</div> }));
vi.mock('@/app/pages/StudentProfilePage.tsx', () => ({ StudentProfilePage: () => <div>student-profile-page</div> }));
vi.mock('@/app/pages/HomeworkTemplatesPage.tsx', () => ({ HomeworkTemplatesPage: () => <div>homework-templates-page</div> }));

describe('App router', () => {
  beforeEach(() => {
    authState = {
      currentUser: null,
      hasPermission: vi.fn(() => true),
    };
  });

  it('shows login page when there is no authenticated user', () => {
    render(
      <MemoryRouter initialEntries={['/students']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByText('login-page')).toBeTruthy();
  });

  it('routes admin users on the home path to the dashboard', () => {
    authState.currentUser = { id: 1, role: 'admin', fullName: 'Admin User' };

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByText('dashboard-page')).toBeTruthy();
  });

  it('redirects teacher users to progress from non-profile routes', async () => {
    authState.currentUser = { id: 2, role: 'teacher', fullName: 'Teacher User' };

    render(
      <MemoryRouter initialEntries={['/students']}>
        <AppRouter />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('progress-page')).toBeTruthy());
  });
});