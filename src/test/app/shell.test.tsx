import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router';
import { AuthGuard, LoginPage, MainLayout, useCollapsibleSidebar } from '@/app/shell';

const navigateMock = vi.fn();

let authState: {
  currentUser: null | { id: number; role: 'superadmin' | 'admin' | 'authorized_teacher' | 'teacher' | 'parent'; fullName: string };
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  hasPermission: ReturnType<typeof vi.fn>;
  sessionExpired: boolean;
  clearSessionExpired: ReturnType<typeof vi.fn>;
};

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}));

describe('shell module', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    authState = {
      currentUser: {
        id: 1,
        role: 'admin',
        fullName: 'Admin User',
      },
      login: vi.fn().mockResolvedValue(true),
      logout: vi.fn(),
      hasPermission: vi.fn(() => true),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    };
  });

  it('toggles sidebar state with the collapsible hook', () => {
    const { result } = renderHook(() => useCollapsibleSidebar());

    expect(result.current.collapsed).toBe(false);
    expect(result.current.mobileOpen).toBe(false);

    act(() => {
      result.current.toggle();
      result.current.toggleMobile();
    });

    expect(result.current.collapsed).toBe(true);
    expect(result.current.mobileOpen).toBe(true);
  });

  it('shows validation error when login form is submitted empty', async () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    fireEvent.click(screen.getAllByRole('button', { name: 'Giriş Yap' })[0]);

    expect(await screen.findByText('Kullanıcı adı ve şifre gereklidir')).toBeTruthy();
    expect(authState.login).not.toHaveBeenCalled();
  });

  it('calls login and navigates to the home route on success', async () => {
    authState.login = vi.fn().mockResolvedValue(true);
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    const usernameInput = document.querySelector('input[placeholder="Kullanıcı adınız"]') as HTMLInputElement | null;
    const passwordInput = document.querySelector('input[placeholder="Şifreniz"]') as HTMLInputElement | null;
    const form = document.querySelector('form') as HTMLFormElement | null;

    expect(usernameInput).toBeTruthy();
    expect(passwordInput).toBeTruthy();
    expect(form).toBeTruthy();

    fireEvent.change(usernameInput!, { target: { value: 'admin' } });
    fireEvent.change(passwordInput!, { target: { value: 'secret' } });
    fireEvent.submit(form!);

    await waitFor(() => expect(authState.login).toHaveBeenCalledWith('admin', 'secret'));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/'));
  });

  it('redirects unauthorized users to login', async () => {
    authState.currentUser = null;

    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/login" element={<div>login-page</div>} />
          <Route path="/secret" element={<AuthGuard requiredRoles={['admin']}><div>secret</div></AuthGuard>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('login-page')).toBeTruthy();
  });

  it('renders protected children when permission is granted', () => {
    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/secret" element={<AuthGuard requiredRoles={['admin']}><div>secret</div></AuthGuard>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('secret')).toBeTruthy();
  });

  it('renders visible navigation items in the main layout', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <MainLayout>
          <div>content</div>
        </MainLayout>
      </MemoryRouter>,
    );

    expect(screen.getByText('Ana Sayfa')).toBeTruthy();
    expect(screen.getByText('Öğrenciler')).toBeTruthy();
    expect(screen.getByText('Yetki Yönetimi')).toBeTruthy();
  });
});