import { useEffect, useState } from 'react';
import type { ReactNode, FormEvent } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router';
import {
  Eye,
  EyeOff,
  Clock,
  Menu,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  LayoutDashboard,
  Users,
  Plus,
  School as SchoolIcon,
  BookOpenCheck,
  UsersRound,
  ClipboardCheck,
  TrendingUp,
  BookMarked,
  MessageSquare,
  FileText,
  Shield,
  ClipboardList,
  BookOpen,
  UserCog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { PERMISSIONS, ROLE_COLORS, ROLE_LABELS } from './constants';

export function useCollapsibleSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return {
    collapsed,
    toggle: () => setCollapsed(!collapsed),
    mobileOpen,
    toggleMobile: () => setMobileOpen(!mobileOpen),
    setMobileOpen,
  };
}

export function LoginPage() {
  const { login, sessionExpired, clearSessionExpired } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      clearSessionExpired();
    };
  }, [clearSessionExpired]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Kullanıcı adı ve şifre gereklidir');
      return;
    }
    const ok = await login(username, password);
    if (ok) navigate('/');
    else setError('Geçersiz kullanıcı adı veya şifre');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/90 via-emerald-800/80 to-teal-900/90 z-10" />
      <div className="absolute left-[5%] bottom-[-5%] w-64 h-80 opacity-20 z-0 rotate-[-8deg] hidden lg:block">
        <img src="/ots/dist/quran-book.png" alt="Kuran" className="w-full h-full object-contain drop-shadow-2xl" />
      </div>
      <div className="absolute right-[5%] bottom-[-5%] w-64 h-80 opacity-20 z-0 rotate-[8deg] hidden lg:block">
        <img src="/ots/dist/risale-book.png" alt="Risale-i Nur" className="w-full h-full object-contain drop-shadow-2xl" />
      </div>
      <div className="absolute inset-0 z-10 opacity-5" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
      <div className="relative z-20 w-full max-w-md">
        <div className="flex justify-center items-end gap-4 mb-6 lg:hidden">
          <img src="/ots/dist/quran-book.png" alt="Kuran" className="w-24 h-32 object-contain rounded-lg shadow-lg opacity-60 rotate-[-6deg]" />
          <img src="/ots/dist/risale-book.png" alt="Risale-i Nur" className="w-24 h-32 object-contain rounded-lg shadow-lg opacity-60 rotate-[6deg]" />
        </div>
        <Card className="shadow-2xl bg-white/95 backdrop-blur-sm border-0">
          <CardHeader className="text-center pb-2">
            <div className="bg-emerald-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
              <img src="/ots/dist/logo-365.jpg" alt="365 Kuran" className="w-full h-full object-cover" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">365 Kuran Kuran Mektebi</CardTitle>
            <CardDescription className="text-emerald-700">Giriş yaparak devam edin</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Kullanıcı Adı</Label><Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Kullanıcı adınız" /></div>
              <div className="space-y-2"><Label>Şifre</Label><div className="relative"><Input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Şifreniz" /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
              {sessionExpired && <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 flex items-center gap-2"><Clock size={16} /><span><strong>Oturum süreniz doldu.</strong> 10 dakika boyunca işlem yapılmadığından oturumunuz kapatıldı. Lütfen tekrar giriş yapın.</span></div>}
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Giriş Yap</Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-white/50 text-xs mt-4">Kuran ve Risale-i Nur Takip Sistemi</p>
      </div>
    </div>
  );
}

export function MainLayout({ children }: { children: ReactNode }) {
  const { currentUser, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebar = useCollapsibleSidebar();
  const allTabs = [
    { id: 'dashboard', label: 'Ana Sayfa', icon: LayoutDashboard, path: '/', roles: ['superadmin', 'admin', 'authorized_teacher', 'parent'] as const },
    { id: 'students', label: 'Öğrenciler', icon: Users, path: '/students', roles: ['superadmin', 'admin', 'authorized_teacher', 'parent'] as const },
    { id: 'student-form', label: 'Öğrenci Ekle', icon: Plus, path: '/student-form', roles: PERMISSIONS.STUDENT_CREATE },
    { id: 'schools', label: 'Medrese', icon: SchoolIcon, path: '/schools', roles: PERMISSIONS.SCHOOL_MANAGE },
    { id: 'lessons', label: 'Dersler', icon: BookOpenCheck, path: '/lessons', roles: PERMISSIONS.LESSON_MANAGE },
    { id: 'classes', label: 'Gruplar', icon: UsersRound, path: '/classes', roles: ['superadmin', 'admin', 'authorized_teacher'] as const },
    { id: 'attendance', label: 'Yoklama', icon: ClipboardCheck, path: '/attendance', roles: ['superadmin', 'admin', 'authorized_teacher'] as const },
    { id: 'progress', label: 'Gelişim Takibi', icon: TrendingUp, path: '/progress', roles: PERMISSIONS.PROGRESS_CREATE },
    { id: 'teacher-lessons', label: 'Öğretmen Dersleri', icon: BookMarked, path: '/teacher-lessons', roles: ['superadmin'] as const },
    { id: 'comments', label: 'Yorumlar', icon: MessageSquare, path: '/comments', roles: ['superadmin', 'admin', 'authorized_teacher'] as const },
    { id: 'reports', label: 'Raporlar', icon: FileText, path: '/reports', roles: PERMISSIONS.REPORT_CREATE },
    { id: 'permissions', label: 'Yetki Yönetimi', icon: Shield, path: '/permissions', roles: PERMISSIONS.PERMISSION_MANAGE },
    { id: 'surveys', label: 'Anket Yönetimi', icon: ClipboardList, path: '/surveys', roles: ['superadmin', 'admin'] as const },
    { id: 'homework-templates', label: 'Ödev Tanımları', icon: BookOpen, path: '/homework-templates', roles: ['superadmin', 'admin'] as const },
    { id: 'users', label: 'Kullanıcılar', icon: UserCog, path: '/users', roles: PERMISSIONS.USER_MANAGE },
  ];

  const visibleTabs = allTabs.filter(t => hasPermission(t.roles));
  const handleNav = (path: string) => {
    navigate(path);
    sidebar.setMobileOpen(false);
  };
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={sidebar.toggleMobile}><Menu size={20} /></Button>
              <Button variant="ghost" size="icon" className="hidden lg:flex h-9 w-9" onClick={sidebar.toggle}>{sidebar.collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</Button>
              <div className="bg-emerald-600 p-0.5 rounded-lg w-8 h-8 flex-shrink-0 overflow-hidden"><img src="/ots/dist/logo-365.jpg" alt="365 Kuran" className="w-full h-full object-cover rounded" /></div>
              <h1 className={`text-base sm:text-lg font-bold text-gray-900 transition-all duration-300 hidden lg:block ${sidebar.collapsed ? 'lg:hidden' : ''}`}>365 Kuran Kuran Mektebi</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Badge className={`${ROLE_COLORS[currentUser!.role]} text-white text-xs`}>{ROLE_LABELS[currentUser!.role]}</Badge>
              <span className="text-sm text-gray-700 hidden sm:inline">{currentUser!.fullName}</span>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={logout} title="Çıkış"><LogOut size={18} className="text-gray-500" /></Button>
            </div>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className={`hidden lg:block bg-white border-r h-[calc(100vh-56px)] sm:h-[calc(100vh-64px)] sticky top-14 sm:top-16 transition-all duration-300 z-40 ${sidebar.collapsed ? 'w-16' : 'w-60'}`}>
          <nav className="p-2 space-y-1">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleNav(tab.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive(tab.path) ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}
                title={sidebar.collapsed ? tab.label : undefined}
              >
                <tab.icon size={18} />{!sidebar.collapsed && <span>{tab.label}</span>}
              </button>
            ))}
          </nav>
        </aside>
        {sidebar.mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => sidebar.setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2"><div className="bg-emerald-600 p-0.5 rounded-lg w-7 h-7 overflow-hidden"><img src="/ots/dist/logo-365.jpg" alt="365 Kuran" className="w-full h-full object-cover rounded" /></div><span className="font-bold text-sm">365 Kuran Kuran Mektebi</span></div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => sidebar.setMobileOpen(false)}><X size={18} /></Button>
              </div>
              <nav className="p-2 space-y-1">
                {visibleTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleNav(tab.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive(tab.path) ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <tab.icon size={18} />{tab.label}
                  </button>
                ))}
              </nav>
            </aside>
          </div>
        )}
        <main className="flex-1 min-w-0 p-3 sm:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export function AuthGuard({ requiredRoles, children }: { requiredRoles: readonly string[]; children: ReactNode }) {
  const { currentUser, hasPermission } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!hasPermission(requiredRoles)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
