import { useState, useMemo, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams, Link } from 'react-router';
import {
  Users, BookOpen, ClipboardCheck, MessageSquare,
  LayoutDashboard, Search, Plus, Pencil, Trash2, CheckCircle2,
  TrendingUp, Send, FileText, Mail, Smartphone, BookOpenCheck, NotebookPen, GraduationCap,
  School as SchoolIcon, ChevronLeft, ChevronRight, Menu, X, UsersRound,
  Save, Shield, UserCog, LogOut, Eye, EyeOff,
  UserCheck, ArrowLeft, BarChart3, ChevronDown, BookMarked,
  ClipboardList, ListChecks, CheckSquare, AlignLeft, CircleDot, Clock,
  AlertTriangle, Printer, Info
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useStudentData } from '@/hooks/useStudentData';
import { useAuth } from '@/hooks/useAuth';
import type { Student, School, Lesson, Attendance, User, UserRole, Survey, SurveyQuestion, SurveyAnswer, QuestionType, HomeworkTemplate, ClassRoom } from '@/types';
import { PERMISSIONS } from '@/types';
import type { PermissionMatrixEntry } from '@/hooks/useAuth';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin', admin: 'Admin',
  authorized_teacher: 'Yetkili Öğr.', teacher: 'Öğretmen', parent: 'Veli'
};
const ROLE_COLORS: Record<UserRole, string> = {
  superadmin: 'bg-red-500', admin: 'bg-blue-500',
  authorized_teacher: 'bg-green-500', teacher: 'bg-cyan-500', parent: 'bg-orange-500'
};

// ====== UTILS ======
function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function getMonthName(key: string) {
  const [y, m] = key.split('-');
  const names = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return `${names[Number(m) - 1]} ${y}`;
}

// ====== LOGIN ======
function LoginPage() {
  const { login, sessionExpired, clearSessionExpired } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  // İlk açılışta sessionExpired mesajını temizle
  useEffect(() => {
    return () => { clearSessionExpired(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Kullanıcı adı ve şifre gereklidir'); return; }
    const ok = await login(username, password);
    if (ok) navigate('/'); else setError('Geçersiz kullanıcı adı veya şifre');
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
            <div className="mt-6 p-3 bg-emerald-50 rounded-lg text-xs text-gray-600 border border-emerald-100">
              <p className="font-medium mb-2 text-emerald-800">Demo Giriş:</p>
              <div className="grid grid-cols-2 gap-2">
                <span className="bg-white px-2 py-1 rounded">superadmin / super123</span>
                <span className="bg-white px-2 py-1 rounded">admin / admin123</span>
                <span className="bg-white px-2 py-1 rounded">yetkiliogretmen / ogretmen123</span>
                <span className="bg-white px-2 py-1 rounded">ogretmen / ogretmen123</span>
                <span className="bg-white px-2 py-1 rounded col-span-2">veli / veli123</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-white/50 text-xs mt-4">Kuran ve Risale-i Nur Takip Sistemi</p>
      </div>
    </div>
  );
}

// ====== SIDEBAR HOOK ======
function useCollapsibleSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return { collapsed, toggle: () => setCollapsed(!collapsed), mobileOpen, toggleMobile: () => setMobileOpen(!mobileOpen), setMobileOpen };
}

// ====== MAIN LAYOUT ======
function MainLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebar = useCollapsibleSidebar();
  const allTabs = [
    { id: 'dashboard', label: 'Ana Sayfa', icon: LayoutDashboard, path: '/', roles: ['superadmin', 'admin', 'authorized_teacher', 'parent'] as UserRole[] },
    { id: 'students', label: 'Öğrenciler', icon: Users, path: '/students', roles: ['superadmin', 'admin', 'authorized_teacher', 'parent'] as UserRole[] },
    { id: 'student-form', label: 'Öğrenci Ekle', icon: Plus, path: '/student-form', roles: PERMISSIONS.STUDENT_CREATE },
    { id: 'schools', label: 'Medrese', icon: SchoolIcon, path: '/schools', roles: PERMISSIONS.SCHOOL_MANAGE },
    { id: 'lessons', label: 'Dersler', icon: BookOpenCheck, path: '/lessons', roles: PERMISSIONS.LESSON_MANAGE },
    { id: 'classes', label: 'Gruplar', icon: UsersRound, path: '/classes', roles: ['superadmin', 'admin', 'authorized_teacher'] as UserRole[] },
    { id: 'attendance', label: 'Yoklama', icon: ClipboardCheck, path: '/attendance', roles: ['superadmin', 'admin', 'authorized_teacher'] as UserRole[] },
    { id: 'progress', label: 'Gelişim Takibi', icon: TrendingUp, path: '/progress', roles: PERMISSIONS.PROGRESS_CREATE },
    { id: 'teacher-lessons', label: 'Öğretmen Dersleri', icon: BookMarked, path: '/teacher-lessons', roles: ['superadmin'] as UserRole[] },
    { id: 'comments', label: 'Yorumlar', icon: MessageSquare, path: '/comments', roles: ['superadmin', 'admin', 'authorized_teacher'] as UserRole[] },
    { id: 'reports', label: 'Raporlar', icon: FileText, path: '/reports', roles: PERMISSIONS.REPORT_CREATE },
    { id: 'permissions', label: 'Yetki Yönetimi', icon: Shield, path: '/permissions', roles: PERMISSIONS.PERMISSION_MANAGE },
    { id: 'surveys', label: 'Anket Yönetimi', icon: ClipboardList, path: '/surveys', roles: ['superadmin', 'admin'] },
    { id: 'homework-templates', label: 'Ödev Tanımları', icon: BookOpen, path: '/homework-templates', roles: ['superadmin', 'admin'] as UserRole[] },
    { id: 'users', label: 'Kullanıcılar', icon: UserCog, path: '/users', roles: PERMISSIONS.USER_MANAGE },
  ];

  const visibleTabs = allTabs.filter(t => hasPermission(t.roles));
  const handleNav = (path: string) => { navigate(path); sidebar.setMobileOpen(false); };
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
              <button key={tab.id} onClick={() => handleNav(tab.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive(tab.path) ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}
                title={sidebar.collapsed ? tab.label : undefined}>
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
                  <button key={tab.id} onClick={() => handleNav(tab.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive(tab.path) ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}>
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

// ====== AUTH GUARD ======
function AuthGuard({ requiredRoles, children }: { requiredRoles: readonly string[]; children: React.ReactNode }) {
  const { currentUser, hasPermission } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!hasPermission(requiredRoles)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// ====== DASHBOARD ======
function DashboardPage() {
  const data = useStudentData();
  const { canViewColumn, currentUser } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const todayAtt = data.attendance.filter(a => a.date === today);

  const monthlyStudents = useMemo(() => {
    const map: Record<string, number> = {};
    data.students.forEach(s => { const key = getMonthKey(s.createdAt); map[key] = (map[key] || 0) + 1; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => ({ month: getMonthName(key), key, count }));
  }, [data.students]);

  const monthlyLessons = useMemo(() => {
    const map: Record<string, number> = {};
    data.students.forEach(s => { const key = getMonthKey(s.createdAt); map[key] = (map[key] || 0) + s.lessons.length; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => ({ month: getMonthName(key), key, count }));
  }, [data.students]);

  const [ps, setPs] = useState('');
  const [psStart, setPsStart] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split('T')[0]; });
  const [psEnd, setPsEnd] = useState(() => new Date().toISOString().split('T')[0]);

  const pcd = useMemo(() => {
    if (!ps) return [];
    return data.progress.filter(p => p.studentId === Number(ps) && p.date >= psStart && p.date <= psEnd)
      .sort((a, b) => a.date.localeCompare(b.date)).map(p => ({
        date: p.date, 'Kuran Sayfa': p.kuranCurrentPage, 'Risale Sayfa': p.risaleCurrentPage, 'Elif-ba Sayfa': p.elifbaCurrentPage,
      }));
  }, [ps, psStart, psEnd, data.progress]);

  // Ogretmen-ders istatistigi (admin/superadmin icin)
  const teacherStats = useMemo(() => {
    if (!currentUser || (currentUser.role !== 'superadmin' && currentUser.role !== 'admin')) return null;
    // localStorage'dan ogretmen-ders atamalarini oku
    try {
      const assignments: { teacherId: number; lessonId: number }[] = JSON.parse(localStorage.getItem('ots_teacher_lessons') || '[]');
      const teachers = JSON.parse(localStorage.getItem('ots_users') || '[]').filter((u: User) => u.role === 'teacher' || u.role === 'authorized_teacher');
      return teachers.map((t: User & { displayName?: string }) => ({
        name: t.displayName || t.username,
        role: t.role === 'authorized_teacher' ? 'Yetkili Öğr.' : 'Öğretmen',
        lessonCount: assignments.filter((a: { teacherId: number }) => a.teacherId === t.id).length,
      })).sort((a: { lessonCount: number }, b: { lessonCount: number }) => b.lessonCount - a.lessonCount);
    } catch { return null; }
  }, [currentUser]);

  const stats = [
    { title: 'Toplam Öğrenci', value: data.students.length, icon: Users, color: 'bg-blue-500' },
    { title: 'Okul', value: data.schools.length, icon: SchoolIcon, color: 'bg-emerald-500' },
    { title: 'Ders', value: data.lessons.length, icon: BookOpen, color: 'bg-purple-500' },
    { title: 'Bugün Mevcut', value: todayAtt.filter(a => a.status === 'present').length, icon: CheckCircle2, color: 'bg-green-500' },
    { title: 'Bugün Yoklama', value: todayAtt.length, icon: ClipboardCheck, color: 'bg-teal-500' },
    { title: 'Gelişim', value: data.progress.length, icon: TrendingUp, color: 'bg-orange-500' },
  ];

  // Ogretmenlere yoklama hatirlatici
  const todayStr = new Date().toISOString().split('T')[0];
  const hasAttendanceToday = data.attendance.some(a => a.date === todayStr);
  const showReminder = currentUser && (currentUser.role === 'authorized_teacher' || currentUser.role === 'teacher') && !hasAttendanceToday && data.students.length > 0;

  return (
    <div className="space-y-6">
      {showReminder && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800 text-sm">Yoklama Hatırlatması</p>
            <p className="text-xs text-amber-700 mt-1">Bugün henüz yoklama almadınız. Öğrencilerin devam durumunu kaydetmek için <Link to="/attendance" className="underline font-medium">Yoklama</Link> sayfasına gidin.</p>
          </div>
        </div>
      )}
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Ana Sayfa</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s, i) => <Card key={i} className="hover:shadow-md transition-shadow"><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-gray-500">{s.title}</p><p className="text-2xl sm:text-3xl font-bold mt-1">{s.value}</p></div><div className={`${s.color} p-2 sm:p-3 rounded-lg text-white`}><s.icon size={20} className="sm:w-6 sm:h-6" /></div></div></CardContent></Card>)}
      </div>
      {teacherStats && teacherStats.length > 0 && (
        <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users size={18} /> Öğretmenler ve Ders Atamaları</CardTitle></CardHeader><CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teacherStats.map((t: { name: string; role: string; lessonCount: number }, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div><p className="font-medium text-sm">{t.name}</p><p className="text-[10px] text-gray-500">{t.role}</p></div>
                <Badge variant={t.lessonCount > 0 ? 'default' : 'secondary'} className="text-xs">{t.lessonCount} ders</Badge>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 size={18} /> Aylık Öğrenci</CardTitle></CardHeader><CardContent>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyStudents}><defs><linearGradient id="cs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip /><Area type="monotone" dataKey="count" name="Öğrenci" stroke="#10b981" fill="url(#cs)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
        </CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 size={18} /> Aylık Ders Kaydı</CardTitle></CardHeader><CardContent>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyLessons}><defs><linearGradient id="cl" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip /><Area type="monotone" dataKey="count" name="Ders" stroke="#8b5cf6" fill="url(#cl)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
        </CardContent></Card>
      </div>
      <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp size={18} /> Öğrenci Öğrenme İlerlemesi</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1"><Select value={ps} onValueChange={setPs}><SelectTrigger><SelectValue placeholder="Öğrenci seçin" /></SelectTrigger><SelectContent>{data.students.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName} ({s.grade})</SelectItem>)}</SelectContent></Select></div>
          <div className="w-full sm:w-40"><Input type="date" value={psStart} onChange={e => setPsStart(e.target.value)} /></div>
          <div className="w-full sm:w-40"><Input type="date" value={psEnd} onChange={e => setPsEnd(e.target.value)} /></div>
        </div>
        {ps ? (
          <div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={pcd}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /><Line type="monotone" dataKey="Kuran Sayfa" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} /><Line type="monotone" dataKey="Risale Sayfa" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} /><Line type="monotone" dataKey="Elif-ba Sayfa" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>
        ) : <div className="text-center py-8 text-gray-400"><TrendingUp size={40} className="mx-auto mb-3 opacity-50" /><p>Öğrenci seçin</p></div>}
      </CardContent></Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Son Öğrenciler</CardTitle></CardHeader><CardContent><div className="space-y-3">
          {data.students.slice(-5).reverse().map(s => {
            const sc = data.schools.find(x => x.id === s.schoolId);
            return <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div><p className="font-medium text-sm">{s.firstName} {s.lastName}{canViewColumn('students', 'tcKimlik') && <span className="text-gray-400 ml-1">({s.tcKimlik})</span>}</p><p className="text-xs text-gray-500">{s.grade} • {sc?.name || '-'}</p></div><Badge variant="outline" className="text-xs">{s.age} yaş</Badge></div>;
          })}
        </div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Son Gelişim</CardTitle></CardHeader><CardContent><div className="space-y-3">
          {data.progress.slice(-5).reverse().map(p => {
            const st = data.students.find(s => s.id === p.studentId);
            return <div key={p.id} className="p-3 bg-gray-50 rounded-lg"><p className="font-medium text-sm">{st?.firstName} {st?.lastName}</p><div className="flex flex-wrap gap-2 mt-1"><Badge variant="outline" className="text-xs">Kuran S.{p.kuranCurrentPage}</Badge><Badge variant="outline" className="text-xs">Risale S.{p.risaleCurrentPage}</Badge>{p.elifbaCurrentPage > 0 && <Badge variant="outline" className="text-xs">Elif-ba S.{p.elifbaCurrentPage}</Badge>}</div></div>;
          })}
        </div></CardContent></Card>
      </div>
    </div>
  );
}

// ====== STUDENT POPUP ======
function StudentPopup({ student, onClose }: { student: Student; onClose: () => void }) {
  const data = useStudentData();
  const { canMarkAttendance, canCreateProgress } = useAuth();
  const [tab, setTab] = useState<'attendance' | 'progress'>('attendance');
  const today = new Date().toISOString().split('T')[0];
  const [attDate, setAttDate] = useState(today);
  const [attLesson, setAttLesson] = useState('');
  const [attNote, setAttNote] = useState('');
  const [progDate, setProgDate] = useState(today);
  const [kuranPages, setKuranPages] = useState('');
  const [kuranCurrent, setKuranCurrent] = useState('');
  const [risalePages, setRisalePages] = useState('');
  const [risaleCurrent, setRisaleCurrent] = useState('');
  const [elifbaCurrent, setElifbaCurrent] = useState('');
  const [progNotes, setProgNotes] = useState('');
  const studentLessons = data.lessons.filter(l => student.lessons.includes(l.id));
  const statusC: Record<string, string> = { present: 'bg-green-500', absent: 'bg-red-500', late: 'bg-yellow-500', excused: 'bg-blue-500' };
  const statusL: Record<string, string> = { present: 'Mevcut', absent: 'Yok', late: 'Geç', excused: 'İzinli' };
  const lastProg = data.progress.filter(p => p.studentId === student.id).slice(-1)[0];

  const markAtt = (status: Attendance['status']) => {
    if (!attLesson) return;
    const ex = data.attendance.find(a => a.studentId === student.id && a.date === attDate && a.lessonId === Number(attLesson));
    if (ex) data.updateAttendanceStatus(ex.id, status);
    else data.addAttendance({ studentId: student.id, date: attDate, status, lessonId: Number(attLesson), note: attNote || undefined });
  };
  const getAttStatus = (lessonId: number, date: string) => data.attendance.find(a => a.studentId === student.id && a.date === date && a.lessonId === lessonId)?.status || null;
  const saveProg = () => {
    data.addProgress({ studentId: student.id, date: progDate, kuranPages: Number(kuranPages) || 0, kuranCurrentPage: Number(kuranCurrent) || 0, risalePages: Number(risalePages) || 0, risaleCurrentPage: Number(risaleCurrent) || 0, elifbaCurrentPage: Number(elifbaCurrent) || 0, notes: progNotes });
    setKuranPages(''); setKuranCurrent(''); setRisalePages(''); setRisaleCurrent(''); setElifbaCurrent(''); setProgNotes('');
  };

  return (
    <Dialog open={!!student} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto p-0">
        <div className="bg-emerald-600 text-white p-4 sm:p-6 rounded-t-lg">
          <h2 className="text-xl sm:text-2xl font-bold">{student.firstName} {student.lastName}</h2>
          <p className="text-emerald-100 text-sm mt-1">{student.grade} • {data.schools.find(sc => sc.id === student.schoolId)?.name || '-'} • {student.city}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-emerald-100"><span>Tel: {student.phone}</span><span>Veli: {student.parentName}</span><span>Veli Tel: {student.parentPhone}</span></div>
        </div>
        <div className="px-4 sm:px-6 pt-4">
          <div className="overflow-x-auto overflow-y-hidden border-b">
            <div className="flex min-w-max whitespace-nowrap">
            {canMarkAttendance && <button onClick={() => setTab('attendance')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'attendance' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}><ClipboardCheck size={16} className="inline mr-1" />Yoklama</button>}
            {canCreateProgress && <button onClick={() => setTab('progress')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'progress' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}><TrendingUp size={16} className="inline mr-1" />İlerleme</button>}
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 pt-2">
          {tab === 'attendance' && canMarkAttendance ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <div className="space-y-1"><Label className="text-xs">Tarih</Label><Input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} className="w-40" /></div>
                <div className="space-y-1"><Label className="text-xs">Ders</Label><Select value={attLesson} onValueChange={setAttLesson}><SelectTrigger className="w-48"><SelectValue placeholder="Ders seçin" /></SelectTrigger><SelectContent>{studentLessons.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1 flex-1 min-w-[200px]"><Label className="text-xs">Not</Label><Input value={attNote} onChange={e => setAttNote(e.target.value)} placeholder="Not..." /></div>
              </div>
              {attLesson && <div className="flex gap-2 flex-wrap">{(['present', 'absent', 'late', 'excused'] as const).map(s => { const cs = getAttStatus(Number(attLesson), attDate); return <Button key={s} size="sm" variant={cs === s ? 'default' : 'outline'} className={cs === s ? statusC[s] : ''} onClick={() => markAtt(s)}>{statusL[s]}</Button>; })}</div>}
              <div className="mt-4"><h4 className="font-medium text-sm mb-2">Yoklama Geçmişi</h4><div className="border rounded-lg overflow-hidden"><Table><TableHeader><TableRow><TableHead className="text-xs">Tarih</TableHead><TableHead className="text-xs">Ders</TableHead><TableHead className="text-xs">Durum</TableHead><TableHead className="text-xs">Not</TableHead></TableRow></TableHeader><TableBody>{data.attendance.filter(a => a.studentId === student.id).slice().reverse().slice(0, 10).map(a => { const l = data.lessons.find(x => x.id === a.lessonId); return <TableRow key={a.id}><TableCell className="text-xs">{a.date}</TableCell><TableCell className="text-xs">{l?.name}</TableCell><TableCell><Badge className={`${statusC[a.status]} text-xs`}>{statusL[a.status]}</Badge></TableCell><TableCell className="text-xs text-gray-500">{a.note || '-'}</TableCell></TableRow>; })}{data.attendance.filter(a => a.studentId === student.id).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-xs text-gray-500 py-4">Kayıt yok</TableCell></TableRow>}</TableBody></Table></div></div>
            </div>
          ) : (
            <div className="space-y-4">
              {lastProg && <Card className="bg-blue-50"><CardContent className="p-3"><p className="text-xs text-gray-600 mb-2">Son Durum ({lastProg.date}):</p><div className="grid grid-cols-3 gap-2 text-center"><div className="bg-white p-2 rounded"><p className="text-xs text-gray-500">Kuran</p><p className="font-bold text-green-700">S.{lastProg.kuranCurrentPage}</p></div><div className="bg-white p-2 rounded"><p className="text-xs text-gray-500">Risale</p><p className="font-bold text-purple-700">S.{lastProg.risaleCurrentPage}</p></div><div className="bg-white p-2 rounded"><p className="text-xs text-gray-500">Elif-ba</p><p className="font-bold text-orange-700">S.{lastProg.elifbaCurrentPage}</p></div></div></CardContent></Card>}
              <div className="space-y-1"><Label className="text-xs">Tarih</Label><Input type="date" value={progDate} onChange={e => setProgDate(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><Label className="text-xs">Kuran Okunan</Label><Input type="number" value={kuranPages} onChange={e => setKuranPages(e.target.value)} /></div><div className="space-y-1"><Label className="text-xs">Kuran Son</Label><Input type="number" value={kuranCurrent} onChange={e => setKuranCurrent(e.target.value)} /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><Label className="text-xs">Risale Okunan</Label><Input type="number" value={risalePages} onChange={e => setRisalePages(e.target.value)} /></div><div className="space-y-1"><Label className="text-xs">Risale Son</Label><Input type="number" value={risaleCurrent} onChange={e => setRisaleCurrent(e.target.value)} /></div></div>
              <div className="space-y-1"><Label className="text-xs">Elif-ba Son</Label><Input type="number" value={elifbaCurrent} onChange={e => setElifbaCurrent(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Notlar</Label><Textarea value={progNotes} onChange={e => setProgNotes(e.target.value)} rows={2} /></div>
              <Button onClick={saveProg} className="w-full"><Save size={16} className="mr-2" /> Kaydet</Button>
              <div className="mt-4"><h4 className="font-medium text-sm mb-2">Tüm Kayıtlar</h4><div className="border rounded-lg overflow-hidden"><Table><TableHeader><TableRow><TableHead className="text-xs">Tarih</TableHead><TableHead className="text-xs">Kuran</TableHead><TableHead className="text-xs">Risale</TableHead><TableHead className="text-xs">Elif-ba</TableHead><TableHead className="text-xs">Not</TableHead></TableRow></TableHeader><TableBody>{data.progress.filter(p => p.studentId === student.id).slice().reverse().map(p => <TableRow key={p.id}><TableCell className="text-xs">{p.date}</TableCell><TableCell className="text-xs">+{p.kuranPages}/S.{p.kuranCurrentPage}</TableCell><TableCell className="text-xs">+{p.risalePages}/S.{p.risaleCurrentPage}</TableCell><TableCell className="text-xs">S.{p.elifbaCurrentPage}</TableCell><TableCell className="text-xs text-gray-500 max-w-[150px] truncate">{p.notes}</TableCell></TableRow>)}{data.progress.filter(p => p.studentId === student.id).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-xs text-gray-500 py-4">Kayıt yok</TableCell></TableRow>}</TableBody></Table></div></div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ====== STUDENTS PAGE ======
function StudentsPage() {
  const data = useStudentData();
  const { canViewColumn, canCreate, canEdit, canDelete } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [popupStudent, setPopupStudent] = useState<Student | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [groupTransferOpen, setGroupTransferOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [assignLessons, setAssignLessons] = useState(true);

  const filtered = data.students.filter(s =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    s.city.toLowerCase().includes(search.toLowerCase()) ||
    s.grade.toLowerCase().includes(search.toLowerCase()) ||
    s.parentName.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelection = (id: number) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const selectAll = () => setSelectedStudents(filtered.map(s => s.id));
  const deselectAll = () => setSelectedStudents([]);

  const handleGroupTransfer = () => {
    if (!selectedGroupId || selectedStudents.length === 0) return;
    const groupId = Number(selectedGroupId);
    const group = data.classRooms.find(c => c.id === groupId);
    if (!group) return;
    const lessonIds = group.lessonIds;
    selectedStudents.forEach(sid => {
      const student = data.students.find(s => s.id === sid);
      if (!student) return;
      const newLessons = assignLessons
        ? Array.from(new Set([...student.lessons, ...lessonIds]))
        : student.lessons;
      data.updateStudent(sid, { groupId, lessons: newLessons });
    });
    setGroupTransferOpen(false);
    setSelectedStudents([]);
    setSelectedGroupId('');
    alert(`${selectedStudents.length} öğrenci ${group.name} grubuna aktarıldı${assignLessons ? ' ve derslere atandı' : ''}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Öğrenciler</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><Input placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
          {canCreate && <Button onClick={() => navigate('/student-form')}><Plus size={18} className="mr-1" /> Ekle</Button>}
        </div>
      </div>

      {/* Seçim toolbar + Gruba Aktar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={selectAll}><CheckSquare size={14} className="mr-1" /> Tümünü Seç</Button>
        <Button size="sm" variant="outline" onClick={deselectAll}><X size={14} className="mr-1" /> Temizle</Button>
        {selectedStudents.length > 0 && (
          <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setGroupTransferOpen(true)}>
            <UsersRound size={14} className="mr-1" /> {selectedStudents.length} Öğrenciyi Gruba Aktar
          </Button>
        )}
        {selectedStudents.length > 0 && <Badge variant="outline" className="text-emerald-600 border-emerald-300">{selectedStudents.length} seçili</Badge>}
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs w-8">✓</TableHead>
            {canViewColumn('students', 'firstName') && <TableHead className="text-xs">Ad Soyad</TableHead>}
            {canViewColumn('students', 'grade') && <TableHead className="text-xs">Sınıf</TableHead>}
            {canViewColumn('students', 'school') && <TableHead className="text-xs">Medrese</TableHead>}
            {canViewColumn('students', 'group') && <TableHead className="text-xs">Grup</TableHead>}
            {canViewColumn('students', 'age') && <TableHead className="text-xs">Yaş</TableHead>}
            {canViewColumn('students', 'city') && <TableHead className="text-xs">Memleket</TableHead>}
            {canViewColumn('students', 'lessons') && <TableHead className="text-xs">Dersler</TableHead>}
            {canViewColumn('students', 'actions') && <TableHead className="text-xs">İşlem</TableHead>}
          </TableRow></TableHeader>
          <TableBody>{filtered.map(s => {
            const sc = data.schools.find(x => x.id === s.schoolId);
            const group = data.classRooms.find(c => c.id === s.groupId);
            const sl = data.lessons.filter(l => s.lessons.includes(l.id));
            return <TableRow key={s.id} onDoubleClick={() => setPopupStudent(s)} className={`cursor-pointer hover:bg-blue-50 ${selectedStudents.includes(s.id) ? 'bg-emerald-50' : ''}`} title="Çift tıklayın">
              <TableCell onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleSelection(s.id)} className="w-4 h-4 accent-emerald-600 cursor-pointer" /></TableCell>
              {canViewColumn('students', 'firstName') && <TableCell className="font-medium text-sm">{s.firstName} {s.lastName}</TableCell>}
              {canViewColumn('students', 'grade') && <TableCell className="text-sm">{s.grade}</TableCell>}
              {canViewColumn('students', 'school') && <TableCell className="text-sm">{sc?.name || '-'}</TableCell>}
              {canViewColumn('students', 'group') && <TableCell>{group ? <Badge className="text-[10px] bg-emerald-500 text-white">{group.name}</Badge> : <span className="text-xs text-gray-400">-</span>}</TableCell>}
              {canViewColumn('students', 'age') && <TableCell className="text-sm">{s.age}</TableCell>}
              {canViewColumn('students', 'city') && <TableCell className="text-sm">{s.city}</TableCell>}
              {canViewColumn('students', 'lessons') && <TableCell><div className="flex flex-wrap gap-1">{sl.slice(0, 2).map(l => <Badge key={l.id} variant="outline" className="text-[10px]">{l.name}</Badge>)}{sl.length > 2 && <span className="text-xs text-gray-400">+{sl.length - 2}</span>}</div></TableCell>}
              {canViewColumn('students', 'actions') && <TableCell><div className="flex gap-1">{canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); navigate(`/student-form/${s.id}`); }}><Pencil size={14} /></Button>}{canDelete && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); if (confirm('Silinsin mi?')) data.deleteStudent(s.id); }}><Trash2 size={14} className="text-red-500" /></Button>}</div></TableCell>}
            </TableRow>;
          })}</TableBody>
        </Table>
      </CardContent></Card>

      {/* Gruba Aktar Dialog */}
      <Dialog open={groupTransferOpen} onOpenChange={setGroupTransferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selectedStudents.length} Öğrenciyi Gruba Aktar</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1"><Label className="text-xs">Hedef Grup *</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger><SelectValue placeholder="Grup seçin" /></SelectTrigger>
                <SelectContent>
                  {data.classRooms.filter(c => c.active).map(cr => (
                    <SelectItem key={cr.id} value={String(cr.id)}>{cr.name} ({cr.grade}) - {cr.lessonIds.length} ders</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedGroupId && (
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-xs text-emerald-700 font-medium">{data.classRooms.find(c => c.id === Number(selectedGroupId))?.name} dersleri:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.classRooms.find(c => c.id === Number(selectedGroupId))?.lessonIds.map(lid => {
                    const l = data.lessons.find(x => x.id === lid);
                    return l ? <Badge key={lid} variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">{l.name}</Badge> : null;
                  })}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="assign-lessons" checked={assignLessons} onChange={e => setAssignLessons(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
              <Label htmlFor="assign-lessons" className="text-xs cursor-pointer">Grubun derslerini de öğrenciye ata</Label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleGroupTransfer} disabled={!selectedGroupId} className="flex-1"><UsersRound size={16} className="mr-1" /> Aktar</Button>
              <Button variant="outline" onClick={() => { setGroupTransferOpen(false); setSelectedGroupId(''); }}>İptal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {popupStudent && <StudentPopup student={popupStudent} onClose={() => setPopupStudent(null)} />}
    </div>
  );
}

// ====== STUDENT FORM PAGE ======
function StudentFormPage() {
  const data = useStudentData();
  const { canViewTC } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const student = isEdit ? data.students.find(s => s.id === Number(id)) : null;

  // Tüm hook'lar conditional return'dan ONCE cagrilmali
  const [activeTab, setActiveTab] = useState<'info' | 'survey'>('info');
  const [surveyAnswers, setSurveyAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState({
    tcKimlik: student?.tcKimlik || '', firstName: student?.firstName || '', lastName: student?.lastName || '',
    birthYear: student?.birthYear || undefined as number | undefined,
    city: student?.city || '', schoolName: student?.schoolName || '',
    grade: student?.grade || '', phone: student?.phone || '', parentName: student?.parentName || '',
    parentPhone: student?.parentPhone || '', email: student?.email || '', lessons: student?.lessons || [] as number[],
    groupId: student?.groupId || undefined as number | undefined
  });

  const computedAge = form.birthYear ? currentYear - form.birthYear : undefined;

  // Düzenleme modunda ogrenci verisi geldiginde formu ve anket cevaplarini doldur
  useEffect(() => {
    if (isEdit && student) {
      setForm({
        tcKimlik: student.tcKimlik || '', firstName: student.firstName || '', lastName: student.lastName || '',
        birthYear: student.birthYear || undefined,
        city: student.city || '', schoolName: student.schoolName || data.schools.find(s => s.id === student.schoolId)?.name || '',
        grade: student.grade || '', phone: student.phone || '', parentName: student.parentName || '',
        parentPhone: student.parentPhone || '', email: student.email || '', lessons: student.lessons || [],
        groupId: student.groupId || undefined
      });
      // Anket cevaplarini localStorage'dan dogrudan oku (useStudentData instance farkliligi icin)
      try {
        const allAnswers: SurveyAnswer[] = JSON.parse(localStorage.getItem('ots_surveyAnswers') || '[]');
        const existing: Record<number, string> = {};
        allAnswers.filter(a => a.studentId === student.id).forEach(a => { existing[a.questionId] = a.answer; });
        setSurveyAnswers(existing);
      } catch { setSurveyAnswers({}); }
    }
  }, [isEdit, id, student?.id]);

  // Conditional return hook'larin TUMUNDEN SONRA olmali
  if (isEdit && !student) return <Navigate to="/students" replace />;

  const saveSurveyAnswers = (studentId: number) => {
    // Mevcut cevapları sil
    data.surveyAnswers.filter(a => a.studentId === studentId).forEach(a => data.deleteSurveyAnswer(a.id));
    // Yeni cevapları kaydet
    Object.entries(surveyAnswers).forEach(([questionId, answer]) => {
      if (answer.trim()) {
        const question = data.surveyQuestions.find(q => q.id === Number(questionId));
        if (question) {
          data.addSurveyAnswer({ studentId, surveyId: question.surveyId, questionId: Number(questionId), answer });
        }
      }
    });
  };

  const handleSubmit = () => {
    // Validation
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('Ad ve soyad zorunludur'); return; }
    if (!form.birthYear || form.birthYear <= 0 || isNaN(form.birthYear)) { setError('Geçerli bir doğum yılı girin'); return; }
    if (!form.grade.trim()) { setError('Grup/Sınıf zorunludur'); return; }
    if (!form.schoolName.trim()) { setError('Okul adı zorunludur'); return; }

    setError('');
    const autoAge = currentYear - Number(form.birthYear);

    // Okul adını mevcut okullarla eşleştir, yoksa yeni okul oluştur
    let schoolId = data.schools.find(s => s.name.toLowerCase().trim() === form.schoolName.toLowerCase().trim())?.id;
    if (!schoolId) {
      const newSchool = data.addSchool({ name: form.schoolName.trim(), address: '', phone: '', principalName: '' });
      schoolId = newSchool.id;
    }

    const p = {
      ...form,
      age: autoAge,
      birthYear: Number(form.birthYear),
      schoolId: Number(schoolId),
      schoolName: form.schoolName.trim(),
      groupId: form.groupId || undefined
    };
    try {
      if (isEdit && student) {
        data.updateStudent(student.id, p);
        saveSurveyAnswers(student.id);
      } else {
        const newStudent = data.addStudent(p);
        saveSurveyAnswers(newStudent.id);
      }
      navigate('/students');
    } catch (err) {
      setError('Kayıt sırasında bir hata oluştu');
    }
  };

  const toggleLesson = (lid: number) => setForm(f => ({ ...f, lessons: f.lessons.includes(lid) ? f.lessons.filter(l => l !== lid) : [...f.lessons, lid] }));

  const handleSurveyAnswerChange = (questionId: number, value: string) => {
    setSurveyAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3"><Button variant="outline" size="icon" onClick={() => navigate('/students')}><ArrowLeft size={18} /></Button><h2 className="text-xl sm:text-2xl font-bold text-gray-900">{isEdit ? 'Düzenle' : 'Yeni Öğrenci'}</h2></div>
      {/* Tab bar her zaman göster: hem ekleme hem düzenleme */}
      <div className="flex border-b bg-white rounded-t-lg px-4 pt-2">
        <button onClick={() => setActiveTab('info')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}><Users size={16} className="inline mr-1" />Öğrenci Bilgileri</button>
        <button onClick={() => setActiveTab('survey')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'survey' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}><ClipboardList size={16} className="inline mr-1" />Anket / Gelişim</button>
      </div>
      {activeTab === 'info' && (
        <Card><CardContent className="p-4 sm:p-6 space-y-4">
          {canViewTC && <div className="space-y-1"><Label className="text-xs">TC Kimlik No</Label><Input value={form.tcKimlik} onChange={e => setForm({ ...form, tcKimlik: e.target.value })} placeholder="11111111111" maxLength={11} /></div>}
          <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><Label className="text-xs">Ad *</Label><Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></div><div className="space-y-1"><Label className="text-xs">Soyad *</Label><Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><Label className="text-xs">Doğum Yılı *</Label><Input type="number" value={form.birthYear || ''} onChange={e => { const val = e.target.value; setForm({ ...form, birthYear: val ? parseInt(val) : undefined }); }} placeholder="örn: 2013" min="1900" max={currentYear} /></div>
            <div className="space-y-1"><Label className="text-xs">Yaş (Otomatik)</Label><Input type="number" value={computedAge || ''} disabled className="bg-gray-100 text-gray-600" /></div>
            <div className="space-y-1"><Label className="text-xs">Memleket</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label className="text-xs">Sınıf *</Label><Input value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} placeholder="örn: 6. Sınıf" /></div>
            <div className="space-y-1"><Label className="text-xs">Medrese *</Label><Input value={form.schoolName} onChange={e => setForm({ ...form, schoolName: e.target.value })} placeholder="Medrese adı yazın" /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Grup</Label>
            <Select value={form.groupId ? String(form.groupId) : 'none'} onValueChange={v => setForm({ ...form, groupId: v === 'none' ? undefined : Number(v) })}>
              <SelectTrigger><SelectValue placeholder="Grup seçin (opsiyonel)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Grup Yok</SelectItem>
                {data.classRooms.filter(c => c.active).map(cr => (
                  <SelectItem key={cr.id} value={String(cr.id)}>{cr.name} ({cr.grade})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><Label className="text-xs">Öğrenci Tel</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div><div className="space-y-1"><Label className="text-xs">E-posta</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div></div>
          <div className="space-y-1"><Label className="text-xs">Veli Adı</Label><Input value={form.parentName} onChange={e => setForm({ ...form, parentName: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Veli Telefon</Label><Input value={form.parentPhone} onChange={e => setForm({ ...form, parentPhone: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Dersler</Label><div className="flex flex-wrap gap-2">{data.lessons.map(l => <Button key={l.id} type="button" size="sm" variant={form.lessons.includes(l.id) ? 'default' : 'outline'} onClick={() => toggleLesson(l.id)}>{l.name}</Button>)}</div></div>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <div className="flex gap-3 pt-2"><Button onClick={handleSubmit} className="flex-1">{isEdit ? 'Güncelle' : 'Ekle'}</Button><Button variant="outline" onClick={() => navigate('/students')}>İptal</Button></div>
        </CardContent></Card>
      )}
      {activeTab === 'survey' && (
        <>
          <StudentSurveyTab data={data} answers={surveyAnswers} onAnswersChange={handleSurveyAnswerChange} />
          <div className="flex gap-3 pt-2"><Button onClick={handleSubmit} className="flex-1">{isEdit ? 'Güncelle' : 'Ekle'}</Button><Button variant="outline" onClick={() => navigate('/students')}>İptal</Button></div>
        </>
      )}
    </div>
  );
}

// ====== SCHOOLS PAGE ======
function SchoolsPage() {
  const data = useStudentData();
  const { canViewColumn } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [form, setForm] = useState<Partial<School>>({});
  const handleSubmit = () => { if (!form.name) return; if (editing) data.updateSchool(editing.id, form); else data.addSchool(form as Omit<School, 'id'>); setOpen(false); setEditing(null); setForm({}); };
  return (
    <div className="space-y-4">
      <div className="flex justify-between"><h2 className="text-xl sm:text-2xl font-bold text-gray-900">Medrese</h2><Button onClick={() => { setEditing(null); setForm({}); setOpen(true); }}><Plus size={18} className="mr-1" /> Medrese Ekle</Button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.schools.map(s => (
          <Card key={s.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2"><CardTitle className="text-base flex justify-between"><span className="truncate pr-2">{s.name}</span><div className="flex gap-1 flex-shrink-0"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(s); setForm(s); setOpen(true); }}><Pencil size={14} /></Button><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirm('Medrese silinsin mi?')) data.deleteSchool(s.id); }}><Trash2 size={14} className="text-red-500" /></Button></div></CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {canViewColumn('schools', 'address') && <p className="text-gray-600"><strong>Adres:</strong> {s.address}</p>}
              {canViewColumn('schools', 'phone') && <p className="text-gray-600"><strong>Tel:</strong> {s.phone}</p>}
              {canViewColumn('schools', 'principal') && <p className="text-gray-600"><strong>Yetkili:</strong> {s.principalName}</p>}
              {canViewColumn('schools', 'studentCount') && <p className="text-gray-500 text-xs">Öğrenci: {data.students.filter(x => x.schoolId === s.id).length}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing ? 'Medrese Düzenle' : 'Yeni Medrese'}</DialogTitle></DialogHeader><div className="space-y-3 pt-4"><div className="space-y-1"><Label className="text-xs">Medrese Adı</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="space-y-1"><Label className="text-xs">Adres</Label><Textarea value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></div><div className="space-y-1"><Label className="text-xs">Telefon</Label><Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div><div className="space-y-1"><Label className="text-xs">Yetkili Adı</Label><Input value={form.principalName || ''} onChange={e => setForm({ ...form, principalName: e.target.value })} /></div><Button onClick={handleSubmit} className="w-full">{editing ? 'Güncelle' : 'Ekle'}</Button></div></DialogContent></Dialog>
    </div>
  );
}

// ====== CLASSES PAGE ======
function ClassesPage() {
  const data = useStudentData();
  const { users } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRoom | null>(null);
  const [form, setForm] = useState<Partial<ClassRoom>>({ active: true, lessonIds: [] });
  const [expandedClass, setExpandedClass] = useState<number | null>(null);
  const [expandedClassLesson, setExpandedClassLesson] = useState<{ roomId: number; lessonId: number } | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [transferRoomId, setTransferRoomId] = useState<number | null>(null);
  const [transferSelectedStudents, setTransferSelectedStudents] = useState<number[]>([]);
  const [transferAssignLessons, setTransferAssignLessons] = useState(true);
  const [lessonAddOpen, setLessonAddOpen] = useState<{ roomId: number; lessonId: number } | null>(null);
  const [lessonAddSelected, setLessonAddSelected] = useState<number[]>([]);

  const handleSubmit = () => {
    if (!form.name || !form.grade) return;
    if (editing) data.updateClassRoom(editing.id, form);
    else data.addClassRoom(form as Omit<ClassRoom, 'id' | 'createdAt'>);
    setOpen(false); setEditing(null); setForm({ active: true, lessonIds: [] });
  };

  const classRooms = selectedSchool
    ? data.classRooms.filter(c => String(c.schoolId) === selectedSchool)
    : data.classRooms;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gruplar</h2>
        <div className="flex gap-2">
          <div className="w-48">
            <Select value={selectedSchool || 'all'} onValueChange={v => setSelectedSchool(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Tüm okullar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Okullar</SelectItem>
                {data.schools.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { setEditing(null); setForm({ active: true, lessonIds: [] }); setOpen(true); }}><Plus size={18} className="mr-1" /> Grup Ekle</Button>
        </div>
      </div>

      {/* İlişki Ağacı: Sınıf → Dersler → Öğrenciler */}
      <div className="space-y-3">
        {classRooms.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <UsersRound size={48} className="mx-auto mb-4 opacity-50" />
            <p>Henüz grup yok. "Grup Ekle" butonu ile yeni grup oluşturun.</p>
          </div>
        )}
        {classRooms.map(room => {
          const school = data.schools.find(s => s.id === room.schoolId);
          const roomLessons = data.getClassRoomLessons(room.id);
          const roomStudents = data.getClassRoomStudents(room.id);
          const isExpanded = expandedClass === room.id;
          return (
            <Card key={room.id} className={`overflow-hidden transition-all ${isExpanded ? 'ring-2 ring-emerald-200' : ''}`}>
              {/* Sınıf Başlık */}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setExpandedClass(isExpanded ? null : room.id)}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isExpanded ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                      <UsersRound size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        {room.name}
                        <Badge variant="outline" className="text-[10px]">{room.grade}</Badge>
                        <Badge className={`text-[10px] ${room.active ? 'bg-green-500' : 'bg-gray-400'} text-white`}>{room.active ? 'Aktif' : 'Pasif'}</Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">{school?.name || '-'} • {roomLessons.length} ders • {roomStudents.length} öğrenci</CardDescription>
                    </div>
                    {isExpanded ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditing(room); setForm({ ...room }); setOpen(true); }}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); if (confirm('Grup silinsin mi?')) data.deleteClassRoom(room.id); }}><Trash2 size={14} className="text-red-500" /></Button>
                  </div>
                </div>
              </CardHeader>

              {/* Açıkken: Dersler ve Öğrenciler */}
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="ml-5 border-l-2 border-emerald-200 pl-4 space-y-3">
                    {/* Dersler */}
                    {roomLessons.length > 0 ? roomLessons.map(lesson => {
                      const lessonStudents = roomStudents.filter(s => s.lessons.includes(lesson.id));
                      const isLessonExpanded = expandedClassLesson?.roomId === room.id && expandedClassLesson?.lessonId === lesson.id;
                      return (
                        <div key={`${room.id}-${lesson.id}`}>
                          <div className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50" onClick={() => setExpandedClassLesson(isLessonExpanded ? null : { roomId: room.id, lessonId: lesson.id })}>
                            <BookOpenCheck size={16} className="text-blue-500" />
                            <span className="text-sm font-medium">{lesson.name}</span>
                            <span className="text-xs text-gray-400">({lesson.startTime}-{lesson.endTime})</span>
                            <Badge variant="outline" className="text-[10px] ml-auto">{lessonStudents.length} öğrenci</Badge>
                            {isLessonExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                          </div>
                          {/* Dersin Öğrencileri */}
                          {isLessonExpanded && (
                            <div className="ml-6 mt-2 space-y-2">
                              {/* Kayıtlı Öğrenciler */}
                              {lessonStudents.length > 0 ? (
                                <div className="space-y-1">
                                  {lessonStudents.map(s => (
                                    <div key={s.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                      <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer" onClick={() => navigate(`/student-profile/${s.id}`)}>{s.firstName[0]}{s.lastName[0]}</div>
                                      <span className="text-sm flex-1 cursor-pointer" onClick={() => navigate(`/student-profile/${s.id}`)}>{s.firstName} {s.lastName}</span>
                                      <Button variant="ghost" size="sm" className="h-7 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { if (confirm(`${s.firstName} ${s.lastName} bu dersten çıkarılsın mı?`)) data.updateStudent(s.id, { lessons: s.lessons.filter(lid => lid !== lesson.id) }); }}>
                                        <X size={12} className="mr-1" /> Çıkar
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ) : <p className="text-xs text-gray-400 py-2">Bu derse kayıtlı öğrenci yok</p>}

                              {/* Derse Öğrenci Ekle */}
                              {(() => {
                                const unassigned = roomStudents.filter(s => !s.lessons.includes(lesson.id));
                                const isAddOpen = lessonAddOpen?.roomId === room.id && lessonAddOpen?.lessonId === lesson.id;
                                if (unassigned.length === 0) return null;
                                return (
                                  <div className="pt-2 border-t border-dashed">
                                    {!isAddOpen ? (
                                      <Button size="sm" variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs" onClick={() => { setLessonAddOpen({ roomId: room.id, lessonId: lesson.id }); setLessonAddSelected([]); }}>
                                        <Plus size={12} className="mr-1" /> Bu Derse Öğrenci Ekle ({unassigned.length})
                                      </Button>
                                    ) : (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-medium text-blue-700">Derse Eklenecek Öğrenciler</span>
                                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setLessonAddOpen(null)}><X size={14} /></Button>
                                        </div>
                                        <div className="max-h-40 overflow-y-auto space-y-1">
                                          {unassigned.map(s => (
                                            <label key={s.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs transition-colors ${lessonAddSelected.includes(s.id) ? 'bg-blue-50 border border-blue-300' : 'bg-gray-50 border border-transparent hover:bg-gray-100'}`}>
                                              <input type="checkbox" checked={lessonAddSelected.includes(s.id)} onChange={() => setLessonAddSelected(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])} className="w-4 h-4 accent-blue-500 flex-shrink-0" />
                                              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">{s.firstName[0]}{s.lastName[0]}</div>
                                              <span className="flex-1">{s.firstName} {s.lastName}</span>
                                            </label>
                                          ))}
                                        </div>
                                        <div className="flex gap-2">
                                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs" disabled={lessonAddSelected.length === 0} onClick={() => { lessonAddSelected.forEach(sid => { const st = data.students.find(s => s.id === sid); if (st) data.updateStudent(sid, { lessons: [...st.lessons, lesson.id] }); }); setLessonAddOpen(null); setLessonAddSelected([]); }}>
                                            <Plus size={12} className="mr-1" /> {lessonAddSelected.length} Öğrenciyi Derse Ekle
                                          </Button>
                                          <Button size="sm" variant="outline" className="text-xs" onClick={() => setLessonAddOpen(null)}>İptal</Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    }) : <p className="text-sm text-gray-400 py-2">Bu gruba atanmış ders yok</p>}

                    {/* Grup Öğretmenleri */}
                    <div className="pt-3 border-t border-purple-200">
                      <h4 className="text-sm font-medium text-purple-700 mb-2">Grup Öğretmenleri</h4>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {room.teacherIds.length > 0 ? room.teacherIds.map(tid => {
                          const t = users.find(u => u.id === tid);
                          return t ? (
                            <Badge key={tid} className="bg-purple-100 text-purple-700 border-purple-300 text-xs flex items-center gap-1">
                              <GraduationCap size={12} /> {t.username}
                              <button onClick={() => data.unassignTeacherFromClassRoom(room.id, tid)} className="ml-1 text-purple-400 hover:text-red-500">×</button>
                            </Badge>
                          ) : null;
                        }) : <span className="text-xs text-gray-400">Atanmış öğretmen yok</span>}
                      </div>
                      {/* Öğretmen ekle */}
                      {(() => {
                        const unassignedTeachers = users.filter(u => (u.role === 'teacher' || u.role === 'authorized_teacher') && !room.teacherIds.includes(u.id));
                        if (unassignedTeachers.length === 0) return null;
                        return (
                          <Select onValueChange={v => { if (v) data.assignTeacherToClassRoom(room.id, Number(v)); }}>
                            <SelectTrigger className="w-56 h-8 text-xs"><SelectValue placeholder="Öğretmen ekle..." /></SelectTrigger>
                            <SelectContent>
                              {unassignedTeachers.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.fullName} ({t.role === 'authorized_teacher' ? 'Yetkili Öğr.' : 'Öğretmen'})</SelectItem>)}
                            </SelectContent>
                          </Select>
                        );
                      })()}
                    </div>

                    {/* Tüm Öğrenciler Özeti */}
                    <div className="pt-3 border-t">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Tüm Öğrenciler ({roomStudents.length})</h4>
                      {roomStudents.length > 0 ? (
                        <div className="space-y-2">
                          {roomStudents.map(s => (
                            <div key={s.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                              <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 cursor-pointer hover:bg-emerald-700" onClick={() => navigate(`/student-profile/${s.id}`)}>{s.firstName[0]}{s.lastName[0]}</div>
                              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/student-profile/${s.id}`)}>
                                <p className="text-sm truncate">{s.firstName} {s.lastName}</p>
                                <p className="text-[10px] text-gray-400">{s.city} • {s.age} yaş</p>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <Select onValueChange={v => {
                                  if (v) {
                                    const targetRoomId = Number(v);
                                    if (confirm(`${s.firstName} ${s.lastName} bu gruba taşınacak mı?`)) {
                                      data.updateStudent(s.id, { groupId: targetRoomId });
                                    }
                                  }
                                }}>
                                  <SelectTrigger className="h-7 text-[10px] w-28"><SelectValue placeholder="Gruba Taşı" /></SelectTrigger>
                                  <SelectContent>
                                    {data.classRooms.filter(c => c.id !== room.id && c.active).map(cr => (
                                      <SelectItem key={cr.id} value={String(cr.id)}>{cr.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => {
                                  if (confirm(`${s.firstName} ${s.lastName} bu gruptan silinecek mi?`)) {
                                    data.updateStudent(s.id, { groupId: null });
                                  }
                                }}>
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-gray-400">Bu gruba kayıtlı öğrenci yok</p>}
                    </div>

                    {/* Bu Gruba Öğrenci Aktar */}
                    <div className="pt-3 border-t border-dashed border-orange-300">
                      {transferRoomId === room.id ? (() => {
                        const unassignedStudents = data.students.filter(s => !s.groupId);
                        const ts = transferSelectedStudents;
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-orange-700">Bu Gruba Öğrenci Aktar ({unassignedStudents.length} boşta)</h4>
                              <Button variant="ghost" size="sm" onClick={() => { setTransferRoomId(null); setTransferSelectedStudents([]); }}><X size={14} /></Button>
                            </div>
                            {unassignedStudents.length > 0 ? (
                              <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                                  {unassignedStudents.map(s => (
                                    <label key={s.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${ts.includes(s.id) ? 'bg-orange-50 border border-orange-300' : 'bg-gray-50 border border-transparent hover:bg-gray-100'}`}>
                                      <input type="checkbox" checked={ts.includes(s.id)} onChange={() => setTransferSelectedStudents(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])} className="w-4 h-4 accent-orange-500 flex-shrink-0" />
                                      <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{s.firstName[0]}{s.lastName[0]}</div>
                                      <div className="min-w-0">
                                        <p className="text-sm truncate">{s.firstName} {s.lastName}</p>
                                        <p className="text-[10px] text-gray-400">{s.grade} • {s.city}</p>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" id={`tl-${room.id}`} checked={transferAssignLessons} onChange={e => setTransferAssignLessons(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                                  <label htmlFor={`tl-${room.id}`} className="text-xs cursor-pointer">Grubun derslerini de öğrenciye ata</label>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => {
                                    if (transferSelectedStudents.length === 0) return;
                                    const lessonIds = transferAssignLessons ? room.lessonIds : [];
                                    transferSelectedStudents.forEach(sid => {
                                      const st = data.students.find(s => s.id === sid);
                                      if (!st) return;
                                      const newLessons = transferAssignLessons ? Array.from(new Set([...st.lessons, ...lessonIds])) : st.lessons;
                                      data.updateStudent(sid, { groupId: room.id, lessons: newLessons });
                                    });
                                    setTransferSelectedStudents([]);
                                    setTransferRoomId(null);
                                    alert(`${transferSelectedStudents.length} öğrenci ${room.name} grubuna aktarıldı${transferAssignLessons ? ' ve derslere atandı' : ''}`);
                                  }} disabled={transferSelectedStudents.length === 0} className="bg-orange-600 hover:bg-orange-700">
                                    <UsersRound size={14} className="mr-1" /> {transferSelectedStudents.length} Öğrenciyi Aktar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => { setTransferRoomId(null); setTransferSelectedStudents([]); }}>İptal</Button>
                                </div>
                              </>
                            ) : <p className="text-xs text-gray-400">Boşta öğrenci yok</p>}
                          </div>
                        );
                      })() : (
                        <Button size="sm" variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => { setTransferRoomId(room.id); setTransferSelectedStudents([]); }}>
                          <UsersRound size={14} className="mr-1" /> Bu Gruba Öğrenci Aktar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Grup Düzenle' : 'Yeni Grup'}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-4">
            <div className="space-y-1"><Label className="text-xs">Grup Adı *</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Örn: 6-A Grubu" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs">Grup Seviyesi *</Label>
                <Select value={form.grade || ''} onValueChange={v => setForm({ ...form, grade: v })}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    {['1. Sınıf','2. Sınıf','3. Sınıf','4. Sınıf','5. Sınıf','6. Sınıf','7. Sınıf','8. Sınıf','9. Sınıf','10. Sınıf','11. Sınıf','12. Sınıf'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Medrese *</Label>
                <Select value={String(form.schoolId || '')} onValueChange={v => setForm({ ...form, schoolId: Number(v) })}>
                  <SelectTrigger><SelectValue placeholder="Okul seçin" /></SelectTrigger>
                  <SelectContent>{data.schools.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Açıklama</Label><Textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Grup açıklaması..." /></div>
            <div className="space-y-1"><Label className="text-xs">Dersler</Label>
              <div className="flex flex-wrap gap-2">
                {data.lessons.map(l => {
                  const selected = (form.lessonIds || []).includes(l.id);
                  return (
                    <button key={l.id} type="button" onClick={() => setForm({ ...form, lessonIds: selected ? (form.lessonIds || []).filter((id: number) => id !== l.id) : [...(form.lessonIds || []), l.id] })} className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${selected ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.active ?? true} onCheckedChange={v => setForm({ ...form, active: v })} /><Label className="text-xs">Aktif</Label></div>
            <Button onClick={handleSubmit} className="w-full">{editing ? 'Güncelle' : 'Ekle'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ====== LESSONS PAGE (2 Grid) ======
function LessonsPage() {
  const data = useStudentData();
  const { canViewColumn, users } = useAuth();
  // Sistemdeki ogretmen listesi (combobox icin)
  const teachers = users.filter(u => u.role === 'teacher' || u.role === 'authorized_teacher');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [form, setForm] = useState<Partial<Lesson>>({});
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [gradeFilter, setGradeFilter] = useState('');
  const grades = useMemo(() => Array.from(new Set(data.students.map(s => s.grade))).sort(), [data.students]);
  const handleSubmit = () => { if (!form.name || !form.teacher || !form.dayOfWeek || !form.startTime || !form.endTime) return; if (editing) data.updateLesson(editing.id, form); else data.addLesson(form as Omit<Lesson, 'id'>); setOpen(false); setEditing(null); setForm({}); };
  const studentsInLesson = useMemo(() => { if (!selectedLesson) return []; return data.students.filter(s => s.lessons.includes(selectedLesson) && (!gradeFilter || s.grade === gradeFilter)); }, [selectedLesson, gradeFilter, data.students]);
  return (
    <div className="space-y-4">
      <div className="flex justify-between"><h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dersler</h2><Button onClick={() => { setEditing(null); setForm({}); setOpen(true); }}><Plus size={18} className="mr-1" /> Ders Ekle</Button></div>
      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Ders Listesi (tıklayın)</CardTitle></CardHeader><CardContent className="p-0 overflow-x-auto">
        <Table><TableHeader><TableRow>
          {canViewColumn('lessons', 'name') && <TableHead className="text-xs">Ders</TableHead>}
          {canViewColumn('lessons', 'teacher') && <TableHead className="text-xs">Öğretmen</TableHead>}
          {canViewColumn('lessons', 'dayOfWeek') && <TableHead className="text-xs">Gün</TableHead>}
          {canViewColumn('lessons', 'time') && <TableHead className="text-xs">Saat</TableHead>}
          {canViewColumn('lessons', 'description') && <TableHead className="text-xs">Açıklama</TableHead>}
          {canViewColumn('lessons', 'studentCount') && <TableHead className="text-xs">Öğrenci</TableHead>}
          {canViewColumn('lessons', 'actions') && <TableHead className="text-xs">İşlem</TableHead>}
        </TableRow></TableHeader><TableBody>{data.lessons.map(l => { const c = data.students.filter(s => s.lessons.includes(l.id)).length; const sel = selectedLesson === l.id; return <TableRow key={l.id} onClick={() => setSelectedLesson(sel ? null : l.id)} className={`cursor-pointer transition-colors ${sel ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : 'hover:bg-gray-50'}`}>
          {canViewColumn('lessons', 'name') && <TableCell className="font-medium text-sm">{l.name}</TableCell>}
          {canViewColumn('lessons', 'teacher') && <TableCell className="text-sm">{l.teacher}</TableCell>}
          {canViewColumn('lessons', 'dayOfWeek') && <TableCell className="text-sm">{l.dayOfWeek}</TableCell>}
          {canViewColumn('lessons', 'time') && <TableCell className="text-xs">{l.startTime}-{l.endTime}</TableCell>}
          {canViewColumn('lessons', 'description') && <TableCell className="text-sm max-w-[150px] truncate text-gray-500">{l.description}</TableCell>}
          {canViewColumn('lessons', 'studentCount') && <TableCell><Badge variant="outline" className="text-xs">{c} öğr.</Badge></TableCell>}
          {canViewColumn('lessons', 'actions') && <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); setEditing(l); setForm(l); setOpen(true); }}><Pencil size={14} /></Button><Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); if (confirm('Ders silinsin mi?')) { data.deleteLesson(l.id); if (selectedLesson === l.id) setSelectedLesson(null); } }}><Trash2 size={14} className="text-red-500" /></Button></div></TableCell>}
        </TableRow>; })}</TableBody></Table>
      </CardContent></Card>
      {selectedLesson && (
        <Card className="border-2 border-emerald-200">
          <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div><CardTitle className="text-base text-emerald-700">{data.lessons.find(l => l.id === selectedLesson)?.name} - Kayıtlı Öğrenciler</CardTitle><CardDescription>{studentsInLesson.length} öğrenci</CardDescription></div>
            <div className="flex gap-2"><Select value={gradeFilter} onValueChange={setGradeFilter}><SelectTrigger className="w-40"><SelectValue placeholder="Sınıf filtresi" /></SelectTrigger><SelectContent><SelectItem value="all">Tümü</SelectItem>{grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>{gradeFilter && <Button variant="outline" size="sm" onClick={() => setGradeFilter('')}>Temizle</Button>}</div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto"><Table><TableHeader><TableRow>
            {canViewColumn('lessonStudents', 'firstName') && <TableHead className="text-xs">Ad Soyad</TableHead>}
            {canViewColumn('lessonStudents', 'grade') && <TableHead className="text-xs">Sınıf</TableHead>}
            {canViewColumn('lessonStudents', 'school') && <TableHead className="text-xs">Okul</TableHead>}
            {canViewColumn('lessonStudents', 'parentName') && <TableHead className="text-xs">Veli</TableHead>}
            {canViewColumn('lessonStudents', 'parentPhone') && <TableHead className="text-xs">Veli Tel</TableHead>}
            {canViewColumn('lessonStudents', 'phone') && <TableHead className="text-xs">Öğrenci Tel</TableHead>}
          </TableRow></TableHeader><TableBody>{studentsInLesson.map(s => { const sc = data.schools.find(x => x.id === s.schoolId); return <TableRow key={s.id} className="hover:bg-gray-50">
            {canViewColumn('lessonStudents', 'firstName') && <TableCell className="font-medium text-sm">{s.firstName} {s.lastName}</TableCell>}
            {canViewColumn('lessonStudents', 'grade') && <TableCell className="text-sm">{s.grade}</TableCell>}
            {canViewColumn('lessonStudents', 'school') && <TableCell className="text-sm">{sc?.name || '-'}</TableCell>}
            {canViewColumn('lessonStudents', 'parentName') && <TableCell className="text-sm">{s.parentName}</TableCell>}
            {canViewColumn('lessonStudents', 'parentPhone') && <TableCell className="text-sm">{s.parentPhone}</TableCell>}
            {canViewColumn('lessonStudents', 'phone') && <TableCell className="text-sm">{s.phone}</TableCell>}
          </TableRow>; })}{studentsInLesson.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Öğrenci bulunamadı</TableCell></TableRow>}</TableBody></Table></CardContent>
        </Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? 'Ders Düzenle' : 'Yeni Ders'}</DialogTitle></DialogHeader><div className="space-y-3 pt-4"><div className="space-y-1"><Label className="text-xs">Ders Adı</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="space-y-1"><Label className="text-xs">Öğretmen</Label><Select value={form.teacher || ''} onValueChange={v => setForm({ ...form, teacher: v })}><SelectTrigger><SelectValue placeholder="Öğretmen seçin" /></SelectTrigger><SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.fullName || t.username}>{t.fullName || t.username}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label className="text-xs">Gün</Label><Select value={form.dayOfWeek || ''} onValueChange={v => setForm({ ...form, dayOfWeek: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><Label className="text-xs">Başlangıç</Label><Input type="time" value={form.startTime || ''} onChange={e => setForm({ ...form, startTime: e.target.value })} /></div><div className="space-y-1"><Label className="text-xs">Bitiş</Label><Input type="time" value={form.endTime || ''} onChange={e => setForm({ ...form, endTime: e.target.value })} /></div></div><div className="space-y-1"><Label className="text-xs">Açıklama</Label><Textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div><Button onClick={handleSubmit} className="w-full">{editing ? 'Güncelle' : 'Ekle'}</Button></div></DialogContent></Dialog>
    </div>
  );
}

// ====== ATTENDANCE PAGE ======
function AttendancePage() {
  const data = useStudentData();
  const { canViewColumn, currentUser, getAssignedLessons } = useAuth();
  const isRestrictedTeacher = currentUser?.role === 'teacher' || currentUser?.role === 'authorized_teacher';
  const myLessonIds = isRestrictedTeacher && currentUser ? getAssignedLessons(currentUser.id) : [];
  const availableLessons = isRestrictedTeacher && currentUser ? data.lessons.filter(l => myLessonIds.includes(l.id)) : data.lessons;

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lesson, setLesson] = useState('');
  const [note, setNote] = useState('');
  // Yerel state: ogrenciId -> status
  const [localAttendance, setLocalAttendance] = useState<Record<number, Attendance['status']>>({});
  const [saved, setSaved] = useState(false);

  const statusC: Record<string, string> = { present: 'bg-green-500', absent: 'bg-red-500', late: 'bg-yellow-500', excused: 'bg-blue-500' };
  const statusL: Record<string, string> = { present: 'Mevcut', absent: 'Yok', late: 'Geç', excused: 'İzinli' };

  const selectedLessonId = lesson ? Number(lesson) : null;
  const studentsToShow = selectedLessonId ? data.students.filter(s => s.lessons.includes(selectedLessonId)) : [];
  const selectedLesson = data.lessons.find(l => l.id === Number(lesson));

  // Ders degistiginde onceki kayitlari yukle
  useEffect(() => {
    if (lesson && date) {
      const prev: Record<number, Attendance['status']> = {};
      data.attendance.filter(a => a.date === date && a.lessonId === Number(lesson)).forEach(a => { prev[a.studentId] = a.status; });
      setLocalAttendance(prev);
      setSaved(false);
    }
  }, [lesson, date]);

  const toggleStatus = (sid: number, s: Attendance['status']) => {
    setLocalAttendance(prev => ({ ...prev, [sid]: prev[sid] === s ? undefined as unknown as Attendance['status'] : s }));
    setSaved(false);
  };

  const handleSaveAll = () => {
    if (!lesson || !date) return;
    const markedCount = Object.keys(localAttendance).length;
    if (markedCount === 0) { alert('Hiçbir öğrenci işaretlenmemiş'); return; }
    if (!confirm(`${markedCount} öğrencinin yoklaması kaydedilecek. Emin misiniz?`)) return;
    
    studentsToShow.forEach(s => {
      const st = localAttendance[s.id];
      if (st) {
        const ex = data.attendance.find(a => a.studentId === s.id && a.date === date && a.lessonId === Number(lesson));
        if (ex) data.updateAttendanceStatus(ex.id, st);
        else data.addAttendance({ studentId: s.id, date, status: st, lessonId: Number(lesson), note: note || undefined });
      }
    });
    setSaved(true);
  };

  const getDisplayStatus = (sid: number) => localAttendance[sid] || null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Yoklama</h2>
      <Card><CardContent className="p-4"><div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1"><Label className="text-xs">Tarih</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" /></div>
        <div className="space-y-1 w-full sm:w-72"><Label className="text-xs">Ders / Seans</Label><Select value={lesson} onValueChange={v => { setLesson(v); setSaved(false); }}><SelectTrigger><SelectValue placeholder="Ders seçin" /></SelectTrigger><SelectContent>{availableLessons.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name} ({l.startTime}-{l.endTime})</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1 flex-1 min-w-[200px]"><Label className="text-xs">Not</Label><Input value={note} onChange={e => setNote(e.target.value)} placeholder="Genel not..." /></div>
      </div></CardContent></Card>
      {isRestrictedTeacher && myLessonIds.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700">Size atanmış ders bulunmuyor. Yönetici ile iletişime geçin.</p>
        </div>
      )}
      {lesson && <>
        <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><div><CardTitle className="text-base">{selectedLesson?.name} — {selectedLesson?.startTime} / {date}</CardTitle><CardDescription>{studentsToShow.length} öğrenci</CardDescription></div>{saved && <Badge variant="outline" className="text-green-600 border-green-300"><CheckCircle2 size={14} className="mr-1" /> Kaydedildi</Badge>}</div></CardHeader><CardContent className="p-0 overflow-x-auto"><Table><TableHeader><TableRow>
          {canViewColumn('attendance', 'student') && <TableHead className="text-xs">Öğrenci</TableHead>}
          {canViewColumn('attendance', 'grade') && <TableHead className="text-xs">Sınıf</TableHead>}
          {canViewColumn('attendance', 'status') && <TableHead className="text-xs">Durum</TableHead>}
          {canViewColumn('attendance', 'actions') && <TableHead className="text-xs">İşlemler</TableHead>}
        </TableRow></TableHeader><TableBody>{studentsToShow.map(s => { const st = getDisplayStatus(s.id); return <TableRow key={s.id}>
          {canViewColumn('attendance', 'student') && <TableCell className="font-medium text-sm">{s.firstName} {s.lastName}</TableCell>}
          {canViewColumn('attendance', 'grade') && <TableCell className="text-sm">{s.grade}</TableCell>}
          {canViewColumn('attendance', 'status') && <TableCell>{st ? <Badge className={`${statusC[st]} text-xs`}>{statusL[st]}</Badge> : <Badge variant="outline" className="text-xs">İşaretlenmedi</Badge>}</TableCell>}
          {canViewColumn('attendance', 'actions') && <TableCell><div className="flex gap-1 flex-wrap">{(['present', 'absent', 'late', 'excused'] as const).map(s2 => <Button key={s2} size="sm" variant={st === s2 ? 'default' : 'outline'} className={`text-xs ${st === s2 ? statusC[s2] : ''}`} onClick={() => toggleStatus(s.id, s2)}>{statusL[s2]}</Button>)}</div></TableCell>}
        </TableRow>; })}</TableBody></Table></CardContent></Card>
        <Button onClick={handleSaveAll} className="w-full" size="lg"><Save size={18} className="mr-2" /> Yoklamayı Kaydet</Button>
      </>}
      {!lesson && <div className="text-center py-12 text-gray-500"><ClipboardCheck size={48} className="mx-auto mb-4 opacity-50" /><p>Ders seçin</p></div>}
    </div>
  );
}

// ====== TEACHER LESSONS PAGE (Öğretmen Dersleri) ======
function TeacherLessonsPage() {
  const data = useStudentData();
  const { currentUser, users, assignLessonToTeacher, unassignLessonFromTeacher, getAssignedLessons } = useAuth();
  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';
  const teachers = users.filter(u => u.role === 'teacher' || u.role === 'authorized_teacher');
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(currentUser?.id || 0);
  const [selLesson, setSelLesson] = useState<number | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);
  const [progDate, setProgDate] = useState(new Date().toISOString().split('T')[0]);
  const [kuranPages, setKuranPages] = useState('');
  const [kuranCurrent, setKuranCurrent] = useState('');
  const [risalePages, setRisalePages] = useState('');
  const [risaleCurrent, setRisaleCurrent] = useState('');
  const [elifbaCurrent, setElifbaCurrent] = useState('');
  const [notes, setNotes] = useState('');

  if (!currentUser) return null;
  const activeTeacherId = isAdmin ? selectedTeacherId : currentUser.id;
  const assignedLessonIds = getAssignedLessons(activeTeacherId);
  const myLessons = data.lessons.filter(l => assignedLessonIds.includes(l.id));
  const allLessons = data.lessons.filter(l => !assignedLessonIds.includes(l.id));
  const activeTeacher = teachers.find(t => t.id === activeTeacherId);

  const studentsInLesson = selLesson ? data.students.filter(s => s.lessons.includes(selLesson)) : [];

  const handleSaveProgress = (studentId: number) => {
    data.addProgress({
      studentId, date: progDate, kuranPages: Number(kuranPages) || 0,
      kuranCurrentPage: Number(kuranCurrent) || 0, risalePages: Number(risalePages) || 0,
      risaleCurrentPage: Number(risaleCurrent) || 0, elifbaCurrentPage: Number(elifbaCurrent) || 0, notes,
    });
    setKuranPages(''); setKuranCurrent(''); setRisalePages(''); setRisaleCurrent(''); setElifbaCurrent(''); setNotes('');
    setExpandedStudent(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Öğretmen Dersleri</h2>
        <Badge variant="outline" className="text-sm w-fit">{myLessons.length} ders atanmış</Badge>
      </div>

      {/* Admin icin ogretmen secimi */}
      {isAdmin && (
        <Card><CardContent className="p-4">
          <div className="space-y-1 max-w-md">
            <Label className="text-xs">Öğretmen Seçin</Label>
            <Select value={String(selectedTeacherId)} onValueChange={v => { setSelectedTeacherId(Number(v)); setSelLesson(null); setExpandedStudent(null); }}>
              <SelectTrigger><SelectValue placeholder="Öğretmen seçin..." /></SelectTrigger>
              <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.fullName || t.username} ({ROLE_LABELS[t.role]})</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent></Card>
      )}

      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Ders Atama{activeTeacher ? ` - ${activeTeacher.fullName || activeTeacher.username}` : ''}</CardTitle><CardDescription>{isAdmin ? 'Seçili öğretmene ders atayın veya çıkarın' : 'Kendinize ders atayın veya çıkarın'}</CardDescription></CardHeader><CardContent>
        <div className="flex flex-wrap gap-2">
          {allLessons.map(l => (
            <Button key={l.id} size="sm" variant="outline" onClick={() => assignLessonToTeacher(activeTeacherId, l.id)} className="flex items-center gap-1">
              <Plus size={14} /> {l.name}
            </Button>
          ))}
          {allLessons.length === 0 && <p className="text-sm text-gray-500">Tüm dersler atanmış</p>}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {myLessons.map(l => (
            <div key={l.id} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selLesson === l.id ? 'bg-emerald-600 text-white' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
              <button type="button" className="flex items-center gap-1" onClick={() => { setSelLesson(l.id); setExpandedStudent(null); }}>
                {l.name}
              </button>
              <button type="button" className="ml-1 p-0.5 rounded-full hover:bg-red-500/30 transition-colors" onClick={() => { unassignLessonFromTeacher(activeTeacherId, l.id); if (selLesson === l.id) setSelLesson(null); }}>
                <X size={12} />
              </button>
            </div>
          ))}
          {myLessons.length === 0 && <p className="text-sm text-gray-500">Henüz ders atanmamış</p>}
        </div>
      </CardContent></Card>

      {selLesson && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{data.lessons.find(l => l.id === selLesson)?.name} - {studentsInLesson.length} Öğrenci</CardTitle><CardDescription>Öğrenciye tıklayarak gelişim girişi yapın</CardDescription></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {studentsInLesson.map(student => {
                const isExpanded = expandedStudent === student.id;
                const lastProg = data.progress.filter(p => p.studentId === student.id).slice(-1)[0];
                return (
                  <div key={student.id}>
                    <div onClick={() => setExpandedStudent(isExpanded ? null : student.id)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${isExpanded ? 'bg-emerald-600' : 'bg-gray-400'}`}>
                          {student.firstName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{student.firstName} {student.lastName}</p>
                          <p className="text-xs text-gray-500">{student.grade} • {student.city}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {lastProg && (
                          <div className="flex gap-2 text-xs text-gray-500 hidden sm:flex">
                            <span>K: S.{lastProg.kuranCurrentPage}</span>
                            <span>R: S.{lastProg.risaleCurrentPage}</span>
                            <span>E: S.{lastProg.elifbaCurrentPage}</span>
                          </div>
                        )}
                        <ChevronDown size={18} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="p-4 bg-emerald-50 border-t border-emerald-100 space-y-3">
                        {lastProg && <p className="text-xs text-gray-600">Son kayıt: {lastProg.date} | Kuran S.{lastProg.kuranCurrentPage} | Risale S.{lastProg.risaleCurrentPage} | Elif-ba S.{lastProg.elifbaCurrentPage}</p>}
                        <div className="space-y-1"><Label className="text-xs">Tarih</Label><Input type="date" value={progDate} onChange={e => setProgDate(e.target.value)} /></div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="space-y-1"><Label className="text-xs">Kuran Okunan</Label><Input type="number" value={kuranPages} onChange={e => setKuranPages(e.target.value)} placeholder="Sayfa" /></div>
                          <div className="space-y-1"><Label className="text-xs">Kuran Son</Label><Input type="number" value={kuranCurrent} onChange={e => setKuranCurrent(e.target.value)} placeholder="Sayfa" /></div>
                          <div className="space-y-1"><Label className="text-xs">Risale Okunan</Label><Input type="number" value={risalePages} onChange={e => setRisalePages(e.target.value)} placeholder="Sayfa" /></div>
                          <div className="space-y-1"><Label className="text-xs">Risale Son</Label><Input type="number" value={risaleCurrent} onChange={e => setRisaleCurrent(e.target.value)} placeholder="Sayfa" /></div>
                          <div className="space-y-1"><Label className="text-xs">Elif-ba Son</Label><Input type="number" value={elifbaCurrent} onChange={e => setElifbaCurrent(e.target.value)} placeholder="Sayfa" /></div>
                          <div className="space-y-1"><Label className="text-xs">Notlar</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Not..." rows={1} /></div>
                        </div>
                        <Button onClick={() => handleSaveProgress(student.id)} className="w-full"><Save size={16} className="mr-2" /> Kaydet</Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {studentsInLesson.length === 0 && <p className="text-center py-8 text-gray-500">Bu derse kayıtlı öğrenci yok</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ====== PROGRESS PAGE ======
function ProgressPage() {
  const data = useStudentData();
  const navigate = useNavigate();
  const { canViewColumn, currentUser, teacherLessons } = useAuth();
  const isTeacher = currentUser?.role === 'teacher' || currentUser?.role === 'authorized_teacher';
  // Ogretmenin atanmis dersleri - dogrudan teacherLessons state'inden oku
  const myLessonIds = isTeacher && currentUser
    ? teacherLessons.filter(a => a.teacherId === currentUser.id).map(a => a.lessonId)
    : [];
  // Ogretmenin atanmis gruplari
  const myGroupIds = isTeacher && currentUser
    ? data.classRooms.filter(r => r.teacherIds.includes(currentUser.id)).map(r => r.id)
    : [];
  const myStudents = isTeacher && currentUser
    ? (() => {
        // Derse atanmis ogrenciler
        const lessonStudents = myLessonIds.length > 0
          ? data.students.filter(s => s.lessons.some((lid: number) => myLessonIds.includes(lid)))
          : [];
        // Grupla atanmis ogrenciler
        const groupStudents = myGroupIds.length > 0
          ? data.students.filter(s => myGroupIds.includes(s.groupId || -1))
          : [];
        // Birlestir, tekrarlari kaldir
        const combined = [...lessonStudents, ...groupStudents];
        const unique = combined.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
        return unique;
      })()
    : data.students;

  const [activeView, setActiveView] = useState<'summary' | 'bulk' | 'records'>('summary');
  const [selLesson, setSelLesson] = useState('');
  const [progDate, setProgDate] = useState(new Date().toISOString().split('T')[0]);
  const [saved, setSaved] = useState(false);

  // Toplu giriş state'i: ogrenciId -> { kuranPages, kuranCurrent, risalePages, ... }
  const [bulkData, setBulkData] = useState<Record<number, { kp: string; kc: string; rp: string; rc: string; ec: string; note: string }>>({});

  // Filtre state'leri
  const [summaryFilterGroup, setSummaryFilterGroup] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterAgeMin, setFilterAgeMin] = useState<string>('');
  const [filterAgeMax, setFilterAgeMax] = useState<string>('');

  // Coklu ogrenci secimi + toplu odev (homework template tabanli)
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [homeworkOpen, setHomeworkOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customTitle, setCustomTitle] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [customDetails, setCustomDetails] = useState('');
  const selectedTemplate = data.homeworkTemplates.find(t => String(t.id) === selectedTemplateId);

  // Coklu ogrenci secimi + toplu ders isleme
  const [lessonLogOpen, setLessonLogOpen] = useState(false);
  const [selectedLessonCategory, setSelectedLessonCategory] = useState<'ilmihal' | 'adab' | 'tecvid' | 'diger' | ''>('');
  const [selectedLessonTopicId, setSelectedLessonTopicId] = useState<string>('');
  const [selectedLessonSubTopic, setSelectedLessonSubTopic] = useState<string>('');
  const [lessonLogNotes, setLessonLogNotes] = useState('');
  const selectedTopic = data.curriculumTopics.find(t => String(t.id) === selectedLessonTopicId);
  const filteredTopics = selectedLessonCategory ? data.curriculumTopics.filter(t => t.category === selectedLessonCategory) : [];

  const lastProg = (sid: number) => {
    const l = data.progress.filter(p => p.studentId === sid);
    return l[l.length - 1];
  };

  const selectedLessonId = selLesson && selLesson !== 'all' ? Number(selLesson) : null;
  const summaryStudents = myStudents.filter(s => {
    if (summaryFilterGroup === 'all') return true;
    const group = data.classRooms.find(c => String(c.id) === summaryFilterGroup);
    if (!group) return false;
    const hasGroupMatch = s.groupId === Number(summaryFilterGroup);
    const hasGradeSchoolMatch = !s.groupId && s.schoolId === group.schoolId && s.grade === group.grade;
    return hasGroupMatch || hasGradeSchoolMatch;
  });

  const summaryGroupOptions = useMemo(() => {
    return data.classRooms
      .filter(c => c.active)
      .filter(c => myStudents.some(s => s.groupId === c.id || (!s.groupId && s.schoolId === c.schoolId && s.grade === c.grade)));
  }, [data.classRooms, myStudents]);

  const studentsToShow = myStudents.filter(s => {
    if (selectedLessonId && !s.lessons.includes(selectedLessonId)) return false;
    if (filterGroup !== 'all') {
      const group = data.classRooms.find(c => String(c.id) === filterGroup);
      if (group) {
        const hasGroupMatch = s.groupId === Number(filterGroup);
        const hasGradeSchoolMatch = !s.groupId && s.schoolId === group.schoolId && s.grade === group.grade;
        if (!hasGroupMatch && !hasGradeSchoolMatch) return false;
      }
    }
    if (filterSchool !== 'all' && String(s.schoolId) !== filterSchool) return false;
    if (filterGrade !== 'all' && s.grade !== filterGrade) return false;
    if (filterAgeMin && s.age < Number(filterAgeMin)) return false;
    if (filterAgeMax && s.age > Number(filterAgeMax)) return false;
    return true;
  });

  // Filtre secenekleri
  const gradeOptions = useMemo(() => Array.from(new Set(data.students.map(s => s.grade))).sort(), [data.students]);
  const activeFiltersCount = [filterGroup !== 'all', filterSchool !== 'all', filterGrade !== 'all', filterAgeMin, filterAgeMax, selLesson].filter(Boolean).length;

  const updateBulk = (sid: number, field: string, value: string) => {
    setBulkData(prev => ({ ...prev, [sid]: { ...prev[sid], [field]: value } }));
    setSaved(false);
  };

  const toggleStudentSelection = (sid: number) => {
    setSelectedStudents(prev => prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]);
  };
  const selectAllStudents = () => {
    setSelectedStudents(studentsToShow.map(s => s.id));
  };
  const deselectAllStudents = () => {
    setSelectedStudents([]);
  };

  const handleSaveHomework = () => {
    if (selectedStudents.length === 0) return;
    const isCustom = selectedTemplateId === 'custom';
    const isTemplate = !!selectedTemplate;
    if (!isCustom && !isTemplate) { alert('Lütfen bir ödev seçin veya Diğer seçeneğini kullanın'); return; }
    if (isCustom && (!customTitle.trim() || !customContent.trim())) { alert('Lütfen ödev başlığı ve içeriğini girin'); return; }

    const title = isTemplate ? selectedTemplate!.title : customTitle;
    const content = isTemplate ? selectedTemplate!.content : customContent;
    const type = isTemplate ? selectedTemplate!.type : 'diger';
    const details = isTemplate ? selectedTemplate!.details : customDetails;

    if (!confirm(`${selectedStudents.length} öğrenciye "${title}" ödevi atanacak. Emin misiniz?`)) return;
    selectedStudents.forEach(sid => {
      data.addHomeworkAssignment({ studentId: sid, type, title, content, details, author: currentUser?.fullName || currentUser?.username || 'Öğretmen', completed: false });
    });
    setHomeworkOpen(false);
    setSelectedTemplateId(''); setCustomTitle(''); setCustomContent(''); setCustomDetails('');
    setSelectedStudents([]);
    alert(`${selectedStudents.length} öğrenciye ödev atandı`);
  };

  const handleSaveLessonLog = () => {
    if (selectedStudents.length === 0) return;
    if (!selectedLessonCategory) { alert('Lütfen bir kategori seçin (İlmihal / Adab / Tecvid)'); return; }
    if (!selectedLessonTopicId) { alert('Lütfen bir konu seçin'); return; }
    if (!selectedLessonSubTopic) { alert('Lütfen bir alt konu seçin'); return; }
    const topic = data.curriculumTopics.find(t => String(t.id) === selectedLessonTopicId);
    if (!confirm(`${selectedStudents.length} öğrenciye "${topic?.title} → ${selectedLessonSubTopic}" ders işlemesi kaydedilecek. Emin misiniz?`)) return;
    selectedStudents.forEach(sid => {
      data.addLessonLog({
        studentId: sid,
        date: progDate,
        category: selectedLessonCategory as 'ilmihal' | 'adab' | 'tecvid',
        topic: topic?.title || '',
        subTopic: selectedLessonSubTopic,
        notes: lessonLogNotes,
        author: currentUser?.fullName || currentUser?.username || 'Öğretmen'
      });
    });
    setLessonLogOpen(false);
    setSelectedLessonCategory(''); setSelectedLessonTopicId(''); setSelectedLessonSubTopic(''); setLessonLogNotes('');
    setSelectedStudents([]);
    alert(`${selectedStudents.length} öğrenciye ders işlemesi kaydedildi`);
  };

  const handleSaveBulk = () => {
    if (!confirm('Tüm öğrencilerin gelişim verileri kaydedilecek. Emin misiniz?')) return;
    let count = 0;
    studentsToShow.forEach(s => {
      const d = bulkData[s.id];
      if (d && (d.kp || d.kc || d.rp || d.rc || d.ec)) {
        data.addProgress({
          studentId: s.id, date: progDate,
          kuranPages: Number(d.kp) || 0, kuranCurrentPage: Number(d.kc) || 0,
          risalePages: Number(d.rp) || 0, risaleCurrentPage: Number(d.rc) || 0,
          elifbaCurrentPage: Number(d.ec) || 0, notes: d.note || ''
        });
        count++;
      }
    });
    setSaved(true);
    alert(`${count} öğrencinin gelişimi kaydedildi`);
  };

  const sendEmail = (student: Student) => {
    const lp = lastProg(student.id);
    const subject = encodeURIComponent(`${student.firstName} ${student.lastName} - Gelişim Raporu`);
    const body = encodeURIComponent(
      `Sayın ${student.parentName || 'Veli'},\n\n` +
      `${student.firstName} ${student.lastName} adlı öğrencimizin son gelişim durumu:\n\n` +
      (lp ? `Kuran: S.${lp.kuranCurrentPage}\nRisale: S.${lp.risaleCurrentPage}\nElif-ba: S.${lp.elifbaCurrentPage}\nNot: ${lp.notes || '-'}\n` : 'Henüz kayıt yok.\n') +
      `\nSaygılarımızla.`
    );
    window.open(`mailto:${student.email || ''}?subject=${subject}&body=${body}`, '_blank');
  };

  const sendSMS = (student: Student) => {
    const lp = lastProg(student.id);
    const text = encodeURIComponent(
      `${student.firstName} ${student.lastName} gelişim: ` +
      (lp ? `Kuran S.${lp.kuranCurrentPage}, Risale S.${lp.risaleCurrentPage}` : 'Henüz kayıt yok')
    );
    window.open(`sms:${student.parentPhone || student.phone || ''}?body=${text}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gelişim Takibi</h2>
        <div className="flex gap-2">
          <Button size="sm" variant={activeView === 'summary' ? 'default' : 'outline'} onClick={() => setActiveView('summary')}><BarChart3 size={16} className="mr-1" />Özet</Button>
          <Button size="sm" variant={activeView === 'bulk' ? 'default' : 'outline'} onClick={() => setActiveView('bulk')}><TrendingUp size={16} className="mr-1" />Toplu Giriş</Button>
          <Button size="sm" variant={activeView === 'records' ? 'default' : 'outline'} onClick={() => setActiveView('records')}><FileText size={16} className="mr-1" />Kayıtlar</Button>
        </div>
      </div>

      {/* --- OZET TABLO (Tum ogrenciler son durum) --- */}
      {activeView === 'summary' && <>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Özet Filtreleri</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1 w-full sm:w-64"><Label className="text-xs">Grup</Label><Select value={summaryFilterGroup} onValueChange={setSummaryFilterGroup}><SelectTrigger><SelectValue placeholder="Tüm gruplar" /></SelectTrigger><SelectContent><SelectItem value="all">Tüm Gruplar</SelectItem>{summaryGroupOptions.map(cr => <SelectItem key={cr.id} value={String(cr.id)}>{cr.name}</SelectItem>)}</SelectContent></Select></div>
              {summaryFilterGroup !== 'all' && <Button variant="ghost" size="sm" onClick={() => setSummaryFilterGroup('all')}><X size={14} className="mr-1" /> Filtreyi Temizle</Button>}
            </div>
          </CardContent>
        </Card>

        {/* Ogretmen bilgilendirme mesajlari */}
        {isTeacher && myLessonIds.length === 0 && myGroupIds.length === 0 && (
          <Card className="border-orange-300 bg-orange-50"><CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle size={20} className="text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-800">Size atanmış ders veya grup bulunmamaktadır.</p>
              <p className="text-xs text-orange-600">Gelişim takibi yapabilmek için yetkili kişiden size ders ataması (Öğretmen Dersleri) veya grup ataması (Gruplar) yapılmasını isteyin.</p>
            </div>
          </CardContent></Card>
        )}
        {isTeacher && (myLessonIds.length > 0 || myGroupIds.length > 0) && myStudents.length === 0 && (
          <Card className="border-blue-300 bg-blue-50"><CardContent className="p-4 flex items-center gap-3">
            <Info size={20} className="text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">Atanmış derslerinize veya gruplarınıza kayıtlı öğrenci bulunmamaktadır.</p>
              {myLessonIds.length > 0 && <p className="text-xs text-blue-600">Dersler: {myLessonIds.map(id => data.lessons.find(l => l.id === id)?.name).filter(Boolean).join(', ')}</p>}
              {myGroupIds.length > 0 && <p className="text-xs text-blue-600">Gruplar: {myGroupIds.map(id => data.classRooms.find(c => c.id === id)?.name).filter(Boolean).join(', ')}</p>}
            </div>
          </CardContent></Card>
        )}
        {isTeacher && (myLessonIds.length > 0 || myGroupIds.length > 0) && (
          <p className="text-xs text-gray-500">
            {myLessonIds.length > 0 && <>Dersler: {myLessonIds.map(id => data.lessons.find(l => l.id === id)?.name).filter(Boolean).join(', ')} • </>}
            {myGroupIds.length > 0 && <>Gruplar: {myGroupIds.map(id => data.classRooms.find(c => c.id === id)?.name).filter(Boolean).join(', ')} • </>}
            {summaryStudents.length} öğrenci
          </p>
        )}
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Tüm Öğrencilerin Son Durumu</CardTitle><CardDescription>{summaryStudents.length} öğrenci</CardDescription></CardHeader><CardContent className="p-0 overflow-x-auto">
          <Table><TableHeader><TableRow>
            <TableHead className="text-xs">Öğrenci</TableHead>
            <TableHead className="text-xs">Sınıf</TableHead>
            <TableHead className="text-xs text-center">Kuran</TableHead>
            <TableHead className="text-xs text-center">Risale</TableHead>
            <TableHead className="text-xs text-center">Elif-ba</TableHead>
            <TableHead className="text-xs text-center">Bugün Yoklama</TableHead>
            <TableHead className="text-xs text-center">Yoklama <span className="text-gray-400">(7g)</span></TableHead>
            <TableHead className="text-xs">Son Kayıt</TableHead>
            <TableHead className="text-xs">Bildirim</TableHead>
          </TableRow></TableHeader><TableBody>{summaryStudents.map(s => {
            const lp = lastProg(s.id);
            // Son 7 gun yoklamasi
            const today = new Date(); today.setHours(0,0,0,0);
            const todayStr = new Date().toISOString().split('T')[0];
            const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const recentAtt = data.attendance.filter(a => a.studentId === s.id && new Date(a.date) >= sevenDaysAgo);
            const presentCount = recentAtt.filter(a => a.status === 'present').length;
            const absentCount = recentAtt.filter(a => a.status === 'absent').length;
            let attBadge = <span className="text-xs text-gray-400">-</span>;
            if (recentAtt.length > 0) {
              if (absentCount > 2) attBadge = <Badge variant="outline" className="text-red-700 border-red-300 text-xs">{presentCount}/{recentAtt.length}</Badge>;
              else attBadge = <Badge variant="outline" className="text-green-700 border-green-300 text-xs">{presentCount}/{recentAtt.length}</Badge>;
            }
            // Bugun yoklamasi
            const todayAtt = data.attendance.find(a => a.studentId === s.id && a.date === todayStr);
            const markToday = (status: 'present' | 'absent') => {
              const lessonId = s.lessons[0] || data.lessons[0]?.id || 1;
              if (todayAtt) data.updateAttendanceStatus(todayAtt.id, status);
              else data.addAttendance({ studentId: s.id, date: todayStr, status, lessonId, note: undefined });
            };
            return <TableRow key={s.id} className="cursor-pointer hover:bg-blue-50" onClick={() => navigate(`/student-profile/${s.id}`)}>
              <TableCell className="font-medium text-sm">{s.firstName} {s.lastName}</TableCell>
              <TableCell className="text-xs">{s.grade}</TableCell>
              <TableCell className="text-center">{lp ? <Badge variant="outline" className="text-green-700 border-green-300 text-xs">S.{lp.kuranCurrentPage}</Badge> : <span className="text-xs text-gray-400">-</span>}</TableCell>
              <TableCell className="text-center">{lp ? <Badge variant="outline" className="text-purple-700 border-purple-300 text-xs">S.{lp.risaleCurrentPage}</Badge> : <span className="text-xs text-gray-400">-</span>}</TableCell>
              <TableCell className="text-center">{lp ? <Badge variant="outline" className="text-orange-700 border-orange-300 text-xs">S.{lp.elifbaCurrentPage}</Badge> : <span className="text-xs text-gray-400">-</span>}</TableCell>
              <TableCell className="text-center">
                <div className="flex gap-1 justify-center">
                  <Button size="sm" variant={todayAtt?.status === 'present' ? 'default' : 'outline'} className={`text-[10px] h-6 px-2 ${todayAtt?.status === 'present' ? 'bg-green-600' : ''}`} onClick={() => markToday('present')}>Var</Button>
                  <Button size="sm" variant={todayAtt?.status === 'absent' ? 'default' : 'outline'} className={`text-[10px] h-6 px-2 ${todayAtt?.status === 'absent' ? 'bg-red-600' : ''}`} onClick={() => markToday('absent')}>Yok</Button>
                </div>
              </TableCell>
              <TableCell className="text-center">{attBadge}</TableCell>
              <TableCell className="text-xs text-gray-500">{lp ? lp.date : 'Kayıt yok'}</TableCell>
              <TableCell><div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => sendEmail(s)} title="E-posta gönder"><Mail size={14} className="text-blue-500" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => sendSMS(s)} title="SMS gönder"><Smartphone size={14} className="text-green-500" /></Button>
              </div></TableCell>
            </TableRow>;
          })}{summaryStudents.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-sm text-gray-500 py-8">Seçili grupta öğrenci bulunamadı</TableCell></TableRow>}</TableBody></Table>
        </CardContent></Card>
      </>}

      {/* --- TOPLU GIRIS (Seans bazinda) --- */}
      {activeView === 'bulk' && <>
        <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">Filtreler {activeFiltersCount > 0 && <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs ml-2">{activeFiltersCount} aktif</Badge>}</CardTitle>{activeFiltersCount > 0 && <Button variant="ghost" size="sm" onClick={() => { setFilterGroup('all'); setFilterSchool('all'); setFilterGrade('all'); setFilterAgeMin(''); setFilterAgeMax(''); setSelLesson(''); }}><X size={14} className="mr-1" /> Filtreleri Temizle</Button>}</div></CardHeader><CardContent className="p-4 pt-0"><div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1"><Label className="text-xs">Tarih</Label><Input type="date" value={progDate} onChange={e => { setProgDate(e.target.value); setSaved(false); }} className="w-36" /></div>
          <div className="space-y-1 w-full sm:w-48"><Label className="text-xs">Grup</Label><Select value={filterGroup} onValueChange={v => { setFilterGroup(v); setSelectedStudents([]); }}><SelectTrigger><SelectValue placeholder="Tüm gruplar" /></SelectTrigger><SelectContent><SelectItem value="all">Tüm Gruplar</SelectItem>{data.classRooms.filter(c => c.active).map(cr => <SelectItem key={cr.id} value={String(cr.id)}>{cr.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 w-full sm:w-56"><Label className="text-xs">Ders / Seans</Label><Select value={selLesson || 'all'} onValueChange={v => { setSelLesson(v === 'all' ? '' : v); setSaved(false); setSelectedStudents([]); }}><SelectTrigger><SelectValue placeholder="Tüm dersler" /></SelectTrigger><SelectContent><SelectItem value="all">Tüm Dersler</SelectItem>{data.lessons.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs">Yaş Min</Label><Input type="number" value={filterAgeMin} onChange={e => { setFilterAgeMin(e.target.value); setSelectedStudents([]); }} placeholder="Min" className="w-16" min={0} max={30} /></div>
          <div className="space-y-1"><Label className="text-xs">Yaş Max</Label><Input type="number" value={filterAgeMax} onChange={e => { setFilterAgeMax(e.target.value); setSelectedStudents([]); }} placeholder="Max" className="w-16" min={0} max={30} /></div>
          <div className="space-y-1 w-full sm:w-48"><Label className="text-xs">Medrese</Label><Select value={filterSchool} onValueChange={v => { setFilterSchool(v); setSelectedStudents([]); }}><SelectTrigger><SelectValue placeholder="Tüm medreseler" /></SelectTrigger><SelectContent><SelectItem value="all">Tüm Medreseler</SelectItem>{data.schools.map(sc => <SelectItem key={sc.id} value={String(sc.id)}>{sc.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 w-full sm:w-36"><Label className="text-xs">Sınıf</Label><Select value={filterGrade} onValueChange={v => { setFilterGrade(v); setSelectedStudents([]); }}><SelectTrigger><SelectValue placeholder="Tüm sınıflar" /></SelectTrigger><SelectContent><SelectItem value="all">Tüm Sınıflar</SelectItem>{gradeOptions.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
        </div></CardContent></Card>

        {studentsToShow.length > 0 && <>
          {/* Seçim toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={selectAllStudents}><CheckSquare size={14} className="mr-1" /> Tümünü Seç</Button>
              <Button size="sm" variant="outline" onClick={deselectAllStudents}><X size={14} className="mr-1" /> Seçimi Temizle</Button>
            </div>
            {selectedStudents.length > 0 && (<>
              <Button size="sm" variant="default" onClick={() => setHomeworkOpen(true)} className="bg-purple-600 hover:bg-purple-700"><BookOpen size={14} className="mr-1" /> {selectedStudents.length} Öğrenciye Ödev Ver</Button>
              <Button size="sm" variant="default" onClick={() => setLessonLogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><NotebookPen size={14} className="mr-1" /> {selectedStudents.length} Öğrenciye Ders İşle</Button>
            </>)}
            {saved && <Badge variant="outline" className="text-green-600 border-green-300"><CheckCircle2 size={14} className="mr-1" /> Kaydedildi</Badge>}
          </div>

          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Toplu Gelişim Girişi{selectedLessonId ? ` — ${data.lessons.find(l => l.id === selectedLessonId)?.name}` : ''}</CardTitle></CardHeader><CardContent className="p-0 overflow-x-auto overflow-y-auto max-h-[70vh]">
            <Table className="min-w-[900px]"><TableHeader><TableRow>
              <TableHead className="text-xs w-8">✓</TableHead>
              <TableHead className="text-xs">Öğrenci</TableHead>
              <TableHead className="text-xs text-center w-24">K.Ok</TableHead>
              <TableHead className="text-xs text-center w-24">K.Son</TableHead>
              <TableHead className="text-xs text-center w-24">R.Ok</TableHead>
              <TableHead className="text-xs text-center w-24">R.Son</TableHead>
              <TableHead className="text-xs text-center w-24">Elif.Son</TableHead>
              <TableHead className="text-xs">Not</TableHead>
            </TableRow></TableHeader><TableBody>{studentsToShow.map(s => (
              <TableRow key={s.id} className={`cursor-pointer hover:bg-blue-50 transition-colors ${selectedStudents.includes(s.id) ? 'bg-purple-50' : ''}`} onDoubleClick={() => navigate(`/student-profile/${s.id}`)}>
                <TableCell onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudentSelection(s.id)} className="w-4 h-4 accent-emerald-600 cursor-pointer" /></TableCell>
                <TableCell className="font-medium text-sm whitespace-nowrap">{s.firstName} {s.lastName}<p className="text-[10px] text-gray-400">{s.grade}</p></TableCell>
                <TableCell><Input type="number" size={1} className="h-8 text-xs w-full min-w-16" value={bulkData[s.id]?.kp || ''} onChange={e => updateBulk(s.id, 'kp', e.target.value)} placeholder="0" /></TableCell>
                <TableCell><Input type="number" size={1} className="h-8 text-xs w-full min-w-16" value={bulkData[s.id]?.kc || ''} onChange={e => updateBulk(s.id, 'kc', e.target.value)} placeholder="0" /></TableCell>
                <TableCell><Input type="number" size={1} className="h-8 text-xs w-full min-w-16" value={bulkData[s.id]?.rp || ''} onChange={e => updateBulk(s.id, 'rp', e.target.value)} placeholder="0" /></TableCell>
                <TableCell><Input type="number" size={1} className="h-8 text-xs w-full min-w-16" value={bulkData[s.id]?.rc || ''} onChange={e => updateBulk(s.id, 'rc', e.target.value)} placeholder="0" /></TableCell>
                <TableCell><Input type="number" size={1} className="h-8 text-xs w-full min-w-16" value={bulkData[s.id]?.ec || ''} onChange={e => updateBulk(s.id, 'ec', e.target.value)} placeholder="0" /></TableCell>
                <TableCell><Input type="text" className="h-8 text-xs w-full min-w-40" value={bulkData[s.id]?.note || ''} onChange={e => updateBulk(s.id, 'note', e.target.value)} placeholder="Not..." /></TableCell>
              </TableRow>
            ))}</TableBody></Table>
          </CardContent></Card>
          <Button onClick={handleSaveBulk} className="w-full" size="lg"><Save size={18} className="mr-2" /> Tümünü Kaydet</Button>

          {/* Toplu Odev Dialog — Hazir Odev Secimi */}
          <Dialog open={homeworkOpen} onOpenChange={setHomeworkOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Toplu Ödev Ver ({selectedStudents.length} öğrenci)</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2 max-h-[60vh] overflow-y-auto">
                {/* Hazir odevler */}
                <div className="space-y-1"><Label className="text-xs">Hazır Ödev Seçin</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {data.homeworkTemplates.filter(t => t.active).map(t => (
                      <button key={t.id} type="button" onClick={() => { setSelectedTemplateId(String(t.id)); }} className={`text-left p-3 rounded-lg border transition-colors ${selectedTemplateId === String(t.id) ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{t.type === 'ezber' ? 'Ezber' : t.type === 'okuma-kuran' ? 'Kuran' : t.type === 'okuma-risale' ? 'Risale' : 'Diğer'}</Badge>
                          <span className="font-medium text-sm">{t.title}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{t.content} {t.details ? `(${t.details} sayfa)` : ''}</p>
                      </button>
                    ))}
                    {/* Diger / Manuel */}
                    <button type="button" onClick={() => { setSelectedTemplateId('custom'); }} className={`text-left p-3 rounded-lg border transition-colors ${selectedTemplateId === 'custom' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px]">Diğer</Badge><span className="font-medium text-sm">Manuel Ödev Gir</span></div>
                      <p className="text-xs text-gray-500 mt-1">Kendi ödevinizi yazın</p>
                    </button>
                  </div>
                </div>
                {/* Diger seciliyse manuel form */}
                {selectedTemplateId === 'custom' && (
                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                    <div className="space-y-1"><Label className="text-xs">Ödev Başlığı *</Label><Input value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="Örn: Yasin Suresi Ezberi" /></div>
                    <div className="space-y-1"><Label className="text-xs">İçerik *</Label><Textarea value={customContent} onChange={e => setCustomContent(e.target.value)} placeholder="Ödev açıklaması..." rows={2} /></div>
                    <div className="space-y-1"><Label className="text-xs">Detay (sayfa vb.)</Label><Input value={customDetails} onChange={e => setCustomDetails(e.target.value)} placeholder="Örn: 5 sayfa" /></div>
                  </div>
                )}
                {/* Secili hazir odev ozeti */}
                {selectedTemplate && (
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <p className="text-xs text-emerald-700 font-medium">Seçilen: {selectedTemplate.title}</p>
                    <p className="text-xs text-emerald-600">{selectedTemplate.content} {selectedTemplate.details ? `(${selectedTemplate.details} sayfa)` : ''}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button onClick={handleSaveHomework} className="flex-1"><Send size={16} className="mr-1" /> Ödev Ver</Button>
                  <Button variant="outline" onClick={() => { setHomeworkOpen(false); setSelectedTemplateId(''); setCustomTitle(''); setCustomContent(''); setCustomDetails(''); }}>İptal</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Toplu Ders İşleme Dialog */}
          <Dialog open={lessonLogOpen} onOpenChange={setLessonLogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Toplu Ders İşleme ({selectedStudents.length} öğrenci)</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2 max-h-[60vh] overflow-y-auto">
                {/* Tarih */}
                <div className="space-y-1"><Label className="text-xs">Tarih</Label><Input type="date" value={progDate} onChange={e => setProgDate(e.target.value)} /></div>
                {/* Kategori */}
                <div className="space-y-1"><Label className="text-xs">Kategori *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['ilmihal', 'adab', 'tecvid'] as const).map(cat => (
                      <button key={cat} type="button" onClick={() => { setSelectedLessonCategory(cat); setSelectedLessonTopicId(''); setSelectedLessonSubTopic(''); }} className={`p-3 rounded-lg border text-center transition-colors ${selectedLessonCategory === cat ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <GraduationCap size={18} className={`mx-auto mb-1 ${selectedLessonCategory === cat ? 'text-emerald-600' : 'text-gray-400'}`} />
                        <span className="text-xs font-medium">{cat}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Konu */}
                {selectedLessonCategory && (
                  <div className="space-y-1"><Label className="text-xs">Konu *</Label>
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                      {filteredTopics.map(t => (
                        <button key={t.id} type="button" onClick={() => { setSelectedLessonTopicId(String(t.id)); setSelectedLessonSubTopic(''); }} className={`text-left p-3 rounded-lg border transition-colors ${selectedLessonTopicId === String(t.id) ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <span className="font-medium text-sm">{t.title}</span>
                          <p className="text-[10px] text-gray-400">{t.subTopics.length} alt konu</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Alt Konu */}
                {selectedTopic && (
                  <div className="space-y-1"><Label className="text-xs">Alt Konu *</Label>
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                      {selectedTopic.subTopics.map((st: string) => (
                        <button key={st} type="button" onClick={() => setSelectedLessonSubTopic(st)} className={`text-left p-2 rounded-lg border transition-colors ${selectedLessonSubTopic === st ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <span className="text-sm">{st}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Notlar */}
                <div className="space-y-1"><Label className="text-xs">Ders Notu</Label><Textarea value={lessonLogNotes} onChange={e => setLessonLogNotes(e.target.value)} placeholder="Ders ile ilgili notlar..." rows={2} /></div>
                {/* Özet */}
                {selectedLessonCategory && selectedLessonTopicId && selectedLessonSubTopic && (
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <p className="text-xs text-emerald-700 font-medium">{selectedLessonCategory === 'ilmihal' ? 'İlmihal' : selectedLessonCategory === 'adab' ? 'Adab' : 'Tecvid'} → {selectedTopic?.title} → {selectedLessonSubTopic}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button onClick={handleSaveLessonLog} className="flex-1"><NotebookPen size={16} className="mr-1" /> Ders İşle</Button>
                  <Button variant="outline" onClick={() => { setLessonLogOpen(false); setSelectedLessonCategory(''); setSelectedLessonTopicId(''); setSelectedLessonSubTopic(''); setLessonLogNotes(''); }}>İptal</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>}
        {studentsToShow.length === 0 && <div className="text-center py-12 text-gray-500"><TrendingUp size={48} className="mx-auto mb-4 opacity-50" /><p>Seçili filtrelere uygun öğrenci bulunamadı</p></div>}
      </>}

      {/* --- KAYITLAR (Detayli gecmis) --- */}
      {activeView === 'records' && <Card><CardHeader className="pb-3"><CardTitle className="text-base">Tüm Gelişim Kayıtları</CardTitle></CardHeader><CardContent className="p-0 overflow-x-auto"><Table><TableHeader><TableRow>
        {canViewColumn('progress', 'date') && <TableHead className="text-xs">Tarih</TableHead>}
        {canViewColumn('progress', 'student') && <TableHead className="text-xs">Öğrenci</TableHead>}
        {canViewColumn('progress', 'kuran') && <TableHead className="text-xs">Kuran</TableHead>}
        {canViewColumn('progress', 'risale') && <TableHead className="text-xs">Risale</TableHead>}
        {canViewColumn('progress', 'elifba') && <TableHead className="text-xs">Elif-ba</TableHead>}
        {canViewColumn('progress', 'notes') && <TableHead className="text-xs">Notlar</TableHead>}
        {canViewColumn('progress', 'actions') && <TableHead className="text-xs">İşlem</TableHead>}
      </TableRow></TableHeader><TableBody>{data.progress.map(p => { const s = data.students.find(x => x.id === p.studentId); return <TableRow key={p.id}>
        {canViewColumn('progress', 'date') && <TableCell className="text-xs">{p.date}</TableCell>}
        {canViewColumn('progress', 'student') && <TableCell className="font-medium text-xs">{s?.firstName} {s?.lastName}</TableCell>}
        {canViewColumn('progress', 'kuran') && <TableCell className="text-xs">+{p.kuranPages}/S.{p.kuranCurrentPage}</TableCell>}
        {canViewColumn('progress', 'risale') && <TableCell className="text-xs">+{p.risalePages}/S.{p.risaleCurrentPage}</TableCell>}
        {canViewColumn('progress', 'elifba') && <TableCell className="text-xs">S.{p.elifbaCurrentPage}</TableCell>}
        {canViewColumn('progress', 'notes') && <TableCell className="text-xs text-gray-500 max-w-[150px] truncate">{p.notes}</TableCell>}
        {canViewColumn('progress', 'actions') && <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirm('Gelişim kaydı silinsin mi?')) data.deleteProgress(p.id); }}><Trash2 size={14} className="text-red-500" /></Button></TableCell>}
      </TableRow>; })}{data.progress.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">Kayıt yok</TableCell></TableRow>}</TableBody></Table></CardContent></Card>}
    </div>
  );
}

// ====== COMMENTS PAGE ======
function CommentsPage() {
  const data = useStudentData();
  const { canViewColumn } = useAuth();
  const [selStudent, setSelStudent] = useState('');
  const [type, setType] = useState<'teacher' | 'parent'>('teacher');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const handleSubmit = () => { if (!selStudent || !content || !author) return; data.addComment({ studentId: Number(selStudent), type, author, content }); setContent(''); setAuthor(''); };
  const filtered = selStudent ? data.comments.filter(c => c.studentId === Number(selStudent)) : data.comments;
  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Yorumlar</h2>
      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Yeni Yorum</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1"><Label className="text-xs">Öğrenci</Label><Select value={selStudent} onValueChange={setSelStudent}><SelectTrigger><SelectValue placeholder="Öğrenci seçin" /></SelectTrigger><SelectContent>{data.students.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs">Tür</Label><Select value={type} onValueChange={v => setType(v as 'teacher' | 'parent')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="teacher">Öğretmen Yorumu</SelectItem><SelectItem value="parent">Veli Yorumu</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs">Yazan</Label><Input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Ad Soyad" /></div>
        </div>
        <div className="space-y-1"><Label className="text-xs">Yorum</Label><Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Yorumunuz..." rows={3} /></div>
        <Button onClick={handleSubmit} disabled={!selStudent || !content || !author}>Yorum Ekle</Button>
      </CardContent></Card>
      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Yorumlar</CardTitle></CardHeader><CardContent><div className="space-y-3">
        {filtered.slice().reverse().map(c => { const s = data.students.find(x => x.id === c.studentId); return <div key={c.id} className="p-4 bg-gray-50 rounded-lg border"><div className="flex items-start justify-between"><div className="flex-1"><div className="flex flex-wrap items-center gap-3 mb-2">
          {canViewColumn('comments', 'student') && <span className="font-medium text-sm">{s?.firstName} {s?.lastName}</span>}
          {canViewColumn('comments', 'type') && <Badge variant={c.type === 'teacher' ? 'default' : 'secondary'} className="text-xs">{c.type === 'teacher' ? 'Öğretmen' : 'Veli'}</Badge>}
          {canViewColumn('comments', 'author') && <span className="text-xs text-gray-500">{c.author}</span>}
          {canViewColumn('comments', 'date') && <span className="text-xs text-gray-400">{c.createdAt}</span>}
        </div>{canViewColumn('comments', 'content') && <p className="text-sm text-gray-700">{c.content}</p>}</div>{canViewColumn('comments', 'actions') && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirm('Yorum silinsin mi?')) data.deleteComment(c.id); }}><Trash2 size={14} className="text-red-500" /></Button>}</div></div>; })}
        {filtered.length === 0 && <p className="text-center py-8 text-gray-500">Henüz yorum yok</p>}
      </div></CardContent></Card>
    </div>
  );
}

// ====== REPORTS PAGE ======
function ReportsPage() {
  const data = useStudentData();
  const { canViewColumn } = useAuth();
  const [selStudent, setSelStudent] = useState('');
  const [selLesson, setSelLesson] = useState('');
  const [selGrade, setSelGrade] = useState('');
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [sendVia, setSendVia] = useState<string[]>([]);
  const [preview, setPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const grades = useMemo(() => Array.from(new Set(data.students.map(s => s.grade))).sort(), [data.students]);
  const filteredStudents = useMemo(() => data.students.filter(s => (!selLesson || s.lessons.includes(Number(selLesson))) && (!selGrade || s.grade === selGrade)), [selLesson, selGrade, data.students]);
  const generateReport = () => {
    if (!selStudent) return;
    const st = data.students.find(s => s.id === Number(selStudent)); if (!st) return;
    const sp = data.progress.filter(p => p.studentId === st.id);
    const lp = sp[sp.length - 1];
    const sa = data.attendance.filter(a => a.studentId === st.id);
    const sl = data.lessons.filter(l => st.lessons.includes(l.id));
    const now = new Date();
    const pt = reportType === 'daily' ? now.toISOString().split('T')[0] : reportType === 'weekly' ? 'Son 7 gün' : 'Son 30 gün';
    const content = `SAYIN ${st.parentName},\n\n${st.firstName} ${st.lastName} için ${pt}:\n\nÖĞRENCİ:\n- Ad: ${st.firstName} ${st.lastName}\n- Sınıf: ${st.grade}\n- Okul: ${data.schools.find(s => s.id === st.schoolId)?.name || '-'}\n- Dersler: ${sl.map(l => l.name).join(', ')}\n\nKURAN:\n${lp ? `- Son: ${lp.kuranCurrentPage}\n- Okunan: ${lp.kuranPages}` : '- Yok'}\n\nRİSALE:\n${lp ? `- Son: ${lp.risaleCurrentPage}\n- Okunan: ${lp.risalePages}` : '- Yok'}\n\nELİF-BA:\n${lp ? `- Son: ${lp.elifbaCurrentPage}` : '- Yok'}\n\nYOKLAMA:\n- Toplam: ${sa.length}, Mevcut: ${sa.filter(a => a.status === 'present').length}, İzinli: ${sa.filter(a => a.status === 'excused').length}, Geç: ${sa.filter(a => a.status === 'late').length}, Yok: ${sa.filter(a => a.status === 'absent').length}\n\nYORUMLAR:\n${data.comments.filter(c => c.studentId === st.id && c.type === 'teacher').slice(-3).map(c => `- ${c.createdAt}: ${c.content}`).join('\n') || '- Yok'}`.trim();
    setPreview(content); setShowPreview(true);
  };
  const handleSend = () => {
    if (!selStudent || !preview) return;
    const now = new Date().toISOString().split('T')[0];
    const start = reportType === 'daily' ? now : reportType === 'weekly' ? new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0] : new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    data.addReport({ studentId: Number(selStudent), type: reportType, periodStart: start, periodEnd: now, content: preview, sentVia: sendVia as ('email' | 'sms')[] });
    setShowPreview(false); setPreview('');
  };
  const toggleSendVia = (m: string) => setSendVia(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m]);
  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Raporlar</h2>
      <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText size={18} /> Gelişim Raporu</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1"><Label className="text-xs">Ders Filtresi</Label><Select value={selLesson} onValueChange={v => { setSelLesson(v); setSelStudent(''); }}><SelectTrigger><SelectValue placeholder="Ders (opsiyonel)" /></SelectTrigger><SelectContent><SelectItem value="all">Tümü</SelectItem>{data.lessons.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs">Sınıf Filtresi</Label><Select value={selGrade} onValueChange={v => { setSelGrade(v); setSelStudent(''); }}><SelectTrigger><SelectValue placeholder="Sınıf (opsiyonel)" /></SelectTrigger><SelectContent><SelectItem value="all">Tümü</SelectItem>{grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs">Öğrenci</Label><Select value={selStudent} onValueChange={setSelStudent}><SelectTrigger><SelectValue placeholder="Öğrenci seçin" /></SelectTrigger><SelectContent>{(selLesson || selGrade ? filteredStudents : data.students).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName} ({s.grade})</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1"><Label className="text-xs">Dönem</Label><Select value={reportType} onValueChange={v => setReportType(v as 'daily' | 'weekly' | 'monthly')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Günlük</SelectItem><SelectItem value="weekly">Haftalık</SelectItem><SelectItem value="monthly">Aylık</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs">Gönderim</Label><div className="flex gap-3 pt-2"><Button type="button" size="sm" variant={sendVia.includes('email') ? 'default' : 'outline'} onClick={() => toggleSendVia('email')} className="flex items-center gap-1"><Mail size={14} /> E-posta</Button><Button type="button" size="sm" variant={sendVia.includes('sms') ? 'default' : 'outline'} onClick={() => toggleSendVia('sms')} className="flex items-center gap-1"><Smartphone size={14} /> SMS</Button></div></div>
        </div>
        <Button onClick={generateReport} disabled={!selStudent} className="flex items-center gap-2"><FileText size={16} /> Oluştur</Button>
      </CardContent></Card>
      {showPreview && <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Send size={16} /> Önizleme</CardTitle></CardHeader><CardContent className="space-y-4"><div className="bg-gray-50 p-4 rounded-lg border whitespace-pre-line text-sm leading-relaxed">{preview}</div><div className="flex gap-3"><Button onClick={handleSend} className="flex items-center gap-2"><Send size={14} /> Gönder</Button><Button variant="outline" onClick={() => setShowPreview(false)}>İptal</Button></div></CardContent></Card>}
      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Gönderilen Raporlar</CardTitle></CardHeader><CardContent className="p-0 overflow-x-auto"><Table><TableHeader><TableRow>
        {canViewColumn('reports', 'date') && <TableHead className="text-xs">Tarih</TableHead>}
        {canViewColumn('reports', 'student') && <TableHead className="text-xs">Öğrenci</TableHead>}
        {canViewColumn('reports', 'type') && <TableHead className="text-xs">Dönem</TableHead>}
        {canViewColumn('reports', 'method') && <TableHead className="text-xs">Yöntem</TableHead>}
        {canViewColumn('reports', 'status') && <TableHead className="text-xs">Durum</TableHead>}
        {canViewColumn('reports', 'actions') && <TableHead className="text-xs">İşlem</TableHead>}
      </TableRow></TableHeader><TableBody>{data.reports.slice().reverse().map(r => { const s = data.students.find(x => x.id === r.studentId); return <TableRow key={r.id}>
        {canViewColumn('reports', 'date') && <TableCell className="text-xs">{r.sentAt}</TableCell>}
        {canViewColumn('reports', 'student') && <TableCell className="font-medium text-xs">{s?.firstName} {s?.lastName}</TableCell>}
        {canViewColumn('reports', 'type') && <TableCell className="text-xs">{r.type === 'daily' ? 'Günlük' : r.type === 'weekly' ? 'Haftalık' : 'Aylık'}</TableCell>}
        {canViewColumn('reports', 'method') && <TableCell className="text-xs">{r.sentVia.join(' + ').toUpperCase()}</TableCell>}
        {canViewColumn('reports', 'status') && <TableCell><Badge variant={r.status === 'sent' ? 'default' : 'outline'} className="text-xs">{r.status === 'sent' ? 'Gönderildi' : 'Taslak'}</Badge></TableCell>}
        {canViewColumn('reports', 'actions') && <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => data.deleteReport(r.id)}><Trash2 size={14} className="text-red-500" /></Button></TableCell>}
      </TableRow>; })}{data.reports.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Henüz rapor yok</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
    </div>
  );
}

// ====== PERMISSIONS PAGE ======
function PermissionsPage() {
  const data = useStudentData();
  const { users, addUser, updateUser, deleteUser, currentUser,
    getColumnsForGrid, updateGridColumnPermission, resetGridColumnsToDefaults,
    permissionMatrix, updatePermissionMatrixEntry, resetPermissionMatrix,
    getAssignedLessons, assignLessonToTeacher, unassignLessonFromTeacher } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'matrix' | 'teacherLinks' | 'gridColumns'>('users');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<Partial<User>>({ active: true });
  const [showPw, setShowPw] = useState(false);
  const [selectedGrid, setSelectedGrid] = useState('students');

  const handleSubmit = () => {
    if (!form.username || !form.password || !form.fullName || !form.role) return;
    if (editing) updateUser(editing.id, form); else addUser(form as Omit<User, 'id'>);
    setOpen(false); setEditing(null); setForm({ active: true });
  };
  const openAdd = () => { setEditing(null); setForm({ active: true, role: 'teacher' }); setOpen(true); };
  const openEdit = (u: User) => { setEditing(u); setForm({ ...u, password: '' }); setOpen(true); };
  const gridColumns = getColumnsForGrid(selectedGrid);
  const gridLabels: Record<string, string> = {
    students: 'Öğrenciler', schools: 'Okullar', lessons: 'Dersler', lessonStudents: 'Ders Öğrencileri',
    attendance: 'Yoklama', progress: 'Gelişim Takibi', comments: 'Yorumlar', reports: 'Raporlar',
  };
  const allRoles: UserRole[] = ['superadmin', 'admin', 'authorized_teacher', 'teacher', 'parent'];
  const toggleRole = (col: typeof gridColumns[0], role: UserRole) => {
    const hasRole = col.allowedRoles.includes(role);
    const newRoles = hasRole ? col.allowedRoles.filter(r => r !== role) : [...col.allowedRoles, role];
    if (newRoles.length > 0) updateGridColumnPermission(selectedGrid, col.columnKey, newRoles as UserRole[]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h2 className="text-xl sm:text-2xl font-bold text-gray-900">Yetki Yönetimi</h2><Button onClick={openAdd}><Plus size={18} className="mr-1" /> Kullanıcı Ekle</Button></div>
      <div className="flex border-b">
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}>Kullanıcılar</button>
        <button onClick={() => setActiveTab('matrix')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'matrix' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}>Yetki Matrisi</button>
        <button onClick={() => setActiveTab('teacherLinks')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'teacherLinks' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}>Öğretmen-Ders İlişkisi</button>
        <button onClick={() => setActiveTab('gridColumns')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'gridColumns' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}>Grid Kolon Yetkileri</button>
      </div>

      {activeTab === 'users' && <Card><CardContent className="p-0 overflow-x-auto">
        <Table><TableHeader><TableRow><TableHead className="text-xs">Kullanıcı</TableHead><TableHead className="text-xs">Ad Soyad</TableHead><TableHead className="text-xs">Rol</TableHead><TableHead className="text-xs">E-posta</TableHead><TableHead className="text-xs">Telefon</TableHead><TableHead className="text-xs">Durum</TableHead><TableHead className="text-xs">İşlem</TableHead></TableRow></TableHeader><TableBody>
          {users.map(u => <TableRow key={u.id} className={u.id === currentUser?.id ? 'bg-blue-50' : ''}>
            <TableCell className="font-medium text-sm flex items-center gap-2"><UserCheck size={16} className="text-gray-400" />{u.username}{u.id === currentUser?.id && <Badge variant="outline" className="text-[10px]">Siz</Badge>}</TableCell>
            <TableCell className="text-sm">{u.fullName}</TableCell>
            <TableCell><Badge className={`${ROLE_COLORS[u.role]} text-white text-xs`}>{ROLE_LABELS[u.role]}</Badge></TableCell>
            <TableCell className="text-sm">{u.email}</TableCell>
            <TableCell className="text-sm">{u.phone}</TableCell>
            <TableCell><Badge variant={u.active ? 'default' : 'secondary'} className="text-xs">{u.active ? 'Aktif' : 'Pasif'}</Badge></TableCell>
            <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}><Pencil size={14} /></Button>{u.id !== currentUser?.id && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirm('Silinsin mi?')) deleteUser(u.id); }}><Trash2 size={14} className="text-red-500" /></Button>}</div></TableCell>
          </TableRow>)}
        </TableBody></Table>
      </CardContent></Card>}

      {activeTab === 'matrix' && <>
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2"><Shield size={18} /> Yetki Matrisi</CardTitle>
          <Button variant="outline" size="sm" onClick={resetPermissionMatrix} className="text-red-500 hover:text-red-700">Varsayılana Sıfırla</Button>
        </div>
        <Card><CardContent className="overflow-x-auto p-0"><Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs min-w-[180px]">Yetki</TableHead>
            {allRoles.map(r => <TableHead key={r} className="text-xs text-center w-24"><Badge className={`${ROLE_COLORS[r]} text-white text-[10px]`}>{ROLE_LABELS[r]}</Badge></TableHead>)}
          </TableRow></TableHeader><TableBody>
            {permissionMatrix.map((entry: PermissionMatrixEntry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-xs font-medium">{entry.label}</TableCell>
                {allRoles.map(r => (
                  <TableCell key={r} className="text-center">
                    <button onClick={() => updatePermissionMatrixEntry(entry.id, r, !entry[r])} className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto transition-colors ${entry[r] ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {entry[r] ? <CheckCircle2 size={14} /> : <X size={14} />}
                    </button>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody></Table></CardContent></Card>
      </>}

      {activeTab === 'teacherLinks' && <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BookMarked size={18} /> Öğretmen-Ders İlişkisi</CardTitle><CardDescription>Hangi öğretmenin hangi derslere atandığını görün</CardDescription></CardHeader><CardContent className="p-0 overflow-x-auto">
        <Table><TableHeader><TableRow>
          <TableHead className="text-xs">Öğretmen</TableHead>
          <TableHead className="text-xs">Rol</TableHead>
          <TableHead className="text-xs">Atanmış Dersler</TableHead>
          <TableHead className="text-xs">Tüm Dersler</TableHead>
        </TableRow></TableHeader><TableBody>
          {users.filter(u => u.role === 'teacher' || u.role === 'authorized_teacher').map(u => {
            const assigned = getAssignedLessons(u.id);
            const assignedLessons = data.lessons.filter(l => assigned.includes(l.id));
            const allLessons = data.lessons;
            return <TableRow key={u.id}>
              <TableCell className="font-medium text-sm">{u.fullName}</TableCell>
              <TableCell><Badge className={`${ROLE_COLORS[u.role]} text-white text-[10px]`}>{ROLE_LABELS[u.role]}</Badge></TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {assignedLessons.length > 0 ? assignedLessons.map(l => (
                    <Badge key={l.id} variant="outline" className="text-[10px] bg-emerald-50 border-emerald-300 text-emerald-700">{l.name}</Badge>
                  )) : <span className="text-xs text-gray-400">Atanmış ders yok</span>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {allLessons.map(l => {
                    const isAssigned = assigned.includes(l.id);
                    return (
                      <button key={l.id} type="button" onClick={() => {
                        if (isAssigned) unassignLessonFromTeacher(u.id, l.id);
                        else assignLessonToTeacher(u.id, l.id);
                      }} className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${isAssigned ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'}`}>
                        {l.name}
                      </button>
                    );
                  })}
                </div>
              </TableCell>
            </TableRow>;
          })}
          {users.filter(u => u.role === 'teacher' || u.role === 'authorized_teacher').length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">Öğretmen kullanıcısı bulunamadı</TableCell></TableRow>}
        </TableBody></Table>
      </CardContent></Card>}

      {activeTab === 'gridColumns' && <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Shield size={18} /> Grid Kolon Yetkileri</CardTitle><CardDescription>Her griddeki kolonların hangi rollere görüneceğini yönetin</CardDescription></CardHeader><CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="w-full sm:w-72"><Label className="text-xs mb-1 block">Grid Seçin</Label><Select value={selectedGrid} onValueChange={setSelectedGrid}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(gridLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
          <Button variant="outline" size="sm" onClick={resetGridColumnsToDefaults} className="text-red-500 hover:text-red-700">Varsayılana Sıfırla</Button>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <Table><TableHeader><TableRow><TableHead className="text-xs">Kolon</TableHead>{allRoles.map(r => <TableHead key={r} className="text-xs text-center"><Badge className={`${ROLE_COLORS[r]} text-white text-[10px]`}>{ROLE_LABELS[r]}</Badge></TableHead>)}</TableRow></TableHeader><TableBody>
            {gridColumns.map(col => <TableRow key={col.columnKey}><TableCell className="text-sm font-medium">{col.columnLabel}</TableCell>{allRoles.map(r => <TableCell key={r} className="text-center"><button onClick={() => toggleRole(col, r)} className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto transition-colors ${col.allowedRoles.includes(r) ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>{col.allowedRoles.includes(r) ? <CheckCircle2 size={14} /> : <X size={14} />}</button></TableCell>)}</TableRow>)}
            {gridColumns.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Kolon bulunamadı</TableCell></TableRow>}
          </TableBody></Table>
        </div>
      </CardContent></Card>}

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</DialogTitle></DialogHeader><div className="space-y-3 pt-4">
        <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><Label className="text-xs">Kullanıcı Adı *</Label><Input value={form.username || ''} onChange={e => setForm({ ...form, username: e.target.value })} /></div><div className="space-y-1"><Label className="text-xs">Ad Soyad *</Label><Input value={form.fullName || ''} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div></div>
        <div className="space-y-1"><Label className="text-xs">Rol *</Label><Select value={form.role || ''} onValueChange={v => setForm({ ...form, role: v as UserRole })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label className="text-xs">{editing ? 'Yeni Şifre (boş=değişmez)' : 'Şifre *'}</Label><div className="relative"><Input type={showPw ? 'text' : 'password'} value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
        <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><Label className="text-xs">E-posta</Label><Input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div><div className="space-y-1"><Label className="text-xs">Telefon</Label><Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></div>
        <div className="flex items-center gap-2"><Switch checked={form.active ?? true} onCheckedChange={v => setForm({ ...form, active: v })} /><Label className="text-xs">Aktif</Label></div>
        <Button onClick={handleSubmit} className="w-full">{editing ? 'Güncelle' : 'Ekle'}</Button>
      </div></DialogContent></Dialog>
    </div>
  );
}

// ====== USERS PAGE ======
function UsersPage() {
  const { users, changePassword, currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPass, setNewPass] = useState('');
  const handleChangePassword = () => { if (!selectedUser || !newPass) return; changePassword(selectedUser.id, newPass); setOpen(false); setSelectedUser(null); setNewPass(''); };
  return (
    <div className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Kullanıcılar</h2>
      <Card><CardContent className="p-0 overflow-x-auto"><Table>
        <TableHeader><TableRow><TableHead className="text-xs">Kullanıcı</TableHead><TableHead className="text-xs">Ad Soyad</TableHead><TableHead className="text-xs">Rol</TableHead><TableHead className="text-xs">E-posta</TableHead><TableHead className="text-xs">Telefon</TableHead><TableHead className="text-xs">Durum</TableHead><TableHead className="text-xs">İşlem</TableHead></TableRow></TableHeader>
        <TableBody>{users.map(u => <TableRow key={u.id} className={u.id === currentUser?.id ? 'bg-blue-50' : ''}>
          <TableCell className="font-medium text-sm">{u.username}{u.id === currentUser?.id && <Badge variant="outline" className="text-[10px] ml-1">Siz</Badge>}</TableCell>
          <TableCell className="text-sm">{u.fullName}</TableCell>
          <TableCell><Badge className={`${ROLE_COLORS[u.role]} text-white text-xs`}>{ROLE_LABELS[u.role]}</Badge></TableCell>
          <TableCell className="text-sm">{u.email}</TableCell>
          <TableCell className="text-sm">{u.phone}</TableCell>
          <TableCell><Badge variant={u.active ? 'default' : 'secondary'} className="text-xs">{u.active ? 'Aktif' : 'Pasif'}</Badge></TableCell>
          <TableCell><Button variant="ghost" size="sm" onClick={() => { setSelectedUser(u); setOpen(true); }}><Shield size={14} className="mr-1" /> Şifre Değiştir</Button></TableCell>
        </TableRow>)}</TableBody>
      </Table></CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Şifre Değiştir - {selectedUser?.fullName}</DialogTitle></DialogHeader><div className="space-y-3 pt-4"><div className="space-y-1"><Label className="text-xs">Yeni Şifre</Label><Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} /></div><Button onClick={handleChangePassword} className="w-full">Değiştir</Button></div></DialogContent></Dialog>
    </div>
  );
}

// ====== SURVEY MANAGEMENT PAGE ======
function SurveyManagementPage() {
  const data = useStudentData();
  const { surveys, addSurvey, updateSurvey, deleteSurvey, addSurveyQuestion, deleteSurveyQuestion, getSurveyQuestions } = data;
  const [open, setOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [surveyForm, setSurveyForm] = useState<Partial<Survey>>({ active: true });
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
  const [questionForm, setQuestionForm] = useState<Partial<SurveyQuestion>>({ type: 'text', options: [], sortOrder: 0 });
  const [optionInput, setOptionInput] = useState('');

  const selectedSurvey = surveys.find(s => String(s.id) === selectedSurveyId);
  const questions = selectedSurveyId ? getSurveyQuestions(Number(selectedSurveyId)) : [];

  const handleSurveySubmit = () => {
    if (!surveyForm.title) return;
    if (editingSurvey) updateSurvey(editingSurvey.id, surveyForm);
    else {
      const newSurvey = addSurvey(surveyForm as Omit<Survey, 'id' | 'createdAt'>);
      if (newSurvey) setSelectedSurveyId(String(newSurvey.id));
    }
    setOpen(false); setEditingSurvey(null); setSurveyForm({ active: true });
  };
  const handleQuestionSubmit = () => {
    if (!questionForm.questionText || !questionForm.type || !selectedSurveyId) return;
    addSurveyQuestion({ ...questionForm as Omit<SurveyQuestion, 'id'>, surveyId: Number(selectedSurveyId), sortOrder: getSurveyQuestions(Number(selectedSurveyId)).length });
    setQuestionForm({ type: 'text', options: [], sortOrder: 0 }); setOptionInput('');
  };
  const addOption = () => {
    if (!optionInput.trim()) return;
    setQuestionForm(f => ({ ...f, options: [...(f.options || []), optionInput.trim()] }));
    setOptionInput('');
  };
  const removeOption = (idx: number) => {
    setQuestionForm(f => ({ ...f, options: (f.options || []).filter((_: string, i: number) => i !== idx) }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h2 className="text-xl sm:text-2xl font-bold text-gray-900">Anket Yönetimi</h2><Button onClick={() => { setEditingSurvey(null); setSurveyForm({ active: true }); setOpen(true); }}><Plus size={18} className="mr-1" /> Anket Ekle</Button></div>

      {/* Survey Selector */}
      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-1 w-full">
            <Label className="text-xs mb-1 block">Anket Seçin</Label>
            <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
              <SelectTrigger><SelectValue placeholder="Anket seçin..." /></SelectTrigger>
              <SelectContent>{surveys.map(sv => <SelectItem key={sv.id} value={String(sv.id)}>{sv.title} {sv.active ? '' : '(Pasif)'}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {selectedSurvey && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditingSurvey(selectedSurvey); setSurveyForm(selectedSurvey); setOpen(true); }}><Pencil size={14} className="mr-1" /> Düzenle</Button>
              <Button variant="ghost" size="sm" onClick={() => { if (confirm('Silinsin mi?')) { deleteSurvey(selectedSurvey.id); setSelectedSurveyId(''); } }}><Trash2 size={14} className="mr-1 text-red-500" /> Sil</Button>
            </div>
          )}
        </div>
      </CardContent></Card>

      {/* Selected Survey Details */}
      {selectedSurvey && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <ClipboardList size={22} className="text-emerald-600" />
              <div>
                <CardTitle className="text-base">{selectedSurvey.title}</CardTitle>
                <CardDescription className="text-xs">{selectedSurvey.description || 'Açıklama yok'} • {questions.length} soru • <Badge variant={selectedSurvey.active ? 'default' : 'secondary'} className="text-[10px]">{selectedSurvey.active ? 'Aktif' : 'Pasif'}</Badge></CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Questions List */}
            {questions.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Sorular</h4>
                {questions.map((q: SurveyQuestion, idx: number) => (
                  <div key={q.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{idx + 1}. {q.questionText}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{q.type === 'text' ? 'Metin' : q.type === 'select' ? 'Tek Seçim' : q.type === 'multiselect' ? 'Çok Seçim' : 'Test'}</Badge>
                        {q.options.length > 0 && q.options.map((o: string, i: number) => <Badge key={i} variant="secondary" className="text-[10px]">{o}</Badge>)}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm('Soru silinsin mi?')) deleteSurveyQuestion(q.id); }}><Trash2 size={12} className="text-red-500" /></Button>
                  </div>
                ))}
              </div>
            ) : <p className="text-center py-4 text-gray-500 text-sm">Henüz soru eklenmemiş</p>}

            {/* Add New Question */}
            <div className="p-4 bg-emerald-50 rounded-lg space-y-3">
              <h4 className="text-sm font-medium text-emerald-800">Yeni Soru Ekle</h4>
              <div className="space-y-1"><Label className="text-xs">Soru Metni</Label><Input value={questionForm.questionText || ''} onChange={e => setQuestionForm(f => ({ ...f, questionText: e.target.value }))} placeholder="Soruyu yazın..." /></div>
              <div className="space-y-1"><Label className="text-xs">Soru Tipi</Label><Select value={questionForm.type} onValueChange={(v: string) => setQuestionForm(f => ({ ...f, type: v as QuestionType, options: v === 'text' ? [] : f.options }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">Metin (Text)</SelectItem><SelectItem value="select">Tek Seçim (Select)</SelectItem><SelectItem value="multiselect">Çok Seçim (Multi Select)</SelectItem><SelectItem value="test">Test (Doğru/Yanlış)</SelectItem></SelectContent></Select></div>
              {questionForm.type !== 'text' && (
                <div className="space-y-2">
                  <Label className="text-xs">Seçenekler</Label>
                  <div className="flex gap-2">
                    <Input value={optionInput} onChange={e => setOptionInput(e.target.value)} placeholder="Seçenek ekle..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())} />
                    <Button type="button" size="sm" onClick={addOption}><Plus size={14} /></Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(questionForm.options || []).map((o: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">{o} <X size={10} className="ml-1 cursor-pointer" onClick={() => removeOption(i)} /></Badge>)}
                  </div>
                </div>
              )}
              <Button onClick={handleQuestionSubmit} size="sm" className="w-full">Soru Ekle</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {surveys.length === 0 && <p className="text-center py-8 text-gray-500">Henüz anket yok. "Anket Ekle" butonu ile yeni anket oluşturun.</p>}

      {/* Survey Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingSurvey ? 'Anket Düzenle' : 'Yeni Anket'}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-4">
            <div className="space-y-1"><Label className="text-xs">Anket Başlığı *</Label><Input value={surveyForm.title || ''} onChange={e => setSurveyForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Açıklama</Label><Textarea value={surveyForm.description || ''} onChange={e => setSurveyForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={surveyForm.active ?? true} onCheckedChange={v => setSurveyForm(f => ({ ...f, active: v }))} /><Label className="text-xs">Aktif</Label></div>
            <Button onClick={handleSurveySubmit} className="w-full">{editingSurvey ? 'Güncelle' : 'Ekle'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ====== STUDENT FORM - SURVEY TAB ======
function StudentSurveyTab({ data, answers, onAnswersChange }: {
  data: ReturnType<typeof useStudentData>;
  answers: Record<number, string>;
  onAnswersChange: (questionId: number, value: string) => void;
}) {
  const activeSurveys = data.surveys.filter(s => s.active);

  const getTypeIcon = (type: string) => {
    switch (type) { case 'text': return <AlignLeft size={14} />; case 'select': return <CircleDot size={14} />; case 'multiselect': return <CheckSquare size={14} />; case 'test': return <ListChecks size={14} />; }
  };

  if (activeSurveys.length === 0) return <p className="text-center text-gray-500 py-8">Henüz anket bulunmamaktadır. Anket Yönetimi menüsünden anket ekleyebilirsiniz.</p>;

  return (
    <div className="space-y-6">
      {activeSurveys.map(survey => {
        const questions = data.getSurveyQuestions(survey.id);
        if (questions.length === 0) return null;
        return (
          <Card key={survey.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <ClipboardList size={18} className="text-emerald-600" />
                <CardTitle className="text-base">{survey.title}</CardTitle>
              </div>
              {survey.description && <CardDescription className="text-xs">{survey.description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map(q => (
                <div key={q.id} className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getTypeIcon(q.type)}
                    <Label className="text-sm font-medium">{q.questionText}</Label>
                    <Badge variant="outline" className="text-[10px]">{q.type === 'text' ? 'Metin' : q.type === 'select' ? 'Tek Seçim' : q.type === 'multiselect' ? 'Çok Seçim' : 'Test'}</Badge>
                  </div>
                  {q.type === 'text' && (
                    <Textarea value={answers[q.id] || ''} onChange={e => onAnswersChange(q.id, e.target.value)} placeholder="Cevabınızı yazın..." rows={2} />
                  )}
                  {q.type === 'select' && (
                    <Select value={answers[q.id] || ''} onValueChange={v => onAnswersChange(q.id, v)}>
                      <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                      <SelectContent>{q.options.map((o: string, i: number) => <SelectItem key={i} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {q.type === 'multiselect' && (
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((o: string, i: number) => (
                        <Button key={i} type="button" size="sm" variant={(answers[q.id] || '').includes(o) ? 'default' : 'outline'} onClick={() => {
                          const current = (answers[q.id] || '').split(', ').filter(Boolean);
                          const updated = current.includes(o) ? current.filter(v => v !== o) : [...current, o];
                          onAnswersChange(q.id, updated.join(', '));
                        }}>{o}</Button>
                      ))}
                    </div>
                  )}
                  {q.type === 'test' && (
                    <div className="flex gap-2">
                      {q.options.map((o: string, i: number) => (
                        <Button key={i} type="button" size="sm" variant={answers[q.id] === o ? 'default' : 'outline'} onClick={() => onAnswersChange(q.id, o)}>{o}</Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ====== STUDENT PROFILE PAGE ======
function StudentProfilePage() {
  const data = useStudentData();
  const navigate = useNavigate();
  const { id } = useParams();
  const student = data.students.find(s => s.id === Number(id));
  const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'progress' | 'homework' | 'lessonlog' | 'report'>('info');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('Aylık');
  const [reportItems, setReportItems] = useState<Record<string, { subject: string; note: string; status: 'iyi' | 'orta' | 'gelisim' | 'baslangic'; score: string }>>({});
  const [reportNote, setReportNote] = useState('');

  if (!student) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/progress')}><ArrowLeft size={16} className="mr-1" />Gelişim Takibine Dön</Button>
        <Card><CardContent className="p-8 text-center text-gray-500">Öğrenci bulunamadı</CardContent></Card>
      </div>
    );
  }

  const school = data.schools.find(sc => sc.id === student.schoolId);
  const studentReportsList = data.getStudentReports(student.id);
  const studentLessons = data.lessons.filter(l => student.lessons.includes(l.id));

  // Yoklama gecmisi
  const studentAttendance = data.attendance.filter(a => a.studentId === student.id).slice().reverse();

  // Progress gecmisi
  const studentProgress = data.progress.filter(p => p.studentId === student.id).slice().reverse();

  // Odevleri (homework assignments)
  const homeworks = data
    .getStudentHomeworks(student.id)
    .sort((a, b) => ((b.createdAt || b.created_at || '') as string).localeCompare((a.createdAt || a.created_at || '') as string));

  // Ders isleme kayitlari
  const lessonLogs = data.getStudentLessonLogs(student.id);

  const statusC: Record<string, string> = { present: 'bg-green-500', absent: 'bg-red-500', late: 'bg-yellow-500', excused: 'bg-blue-500' };
  const statusL: Record<string, string> = { present: 'Mevcut', absent: 'Yok', late: 'Geç', excused: 'İzinli' };

  // Yoklama ozeti
  const attStats = { total: studentAttendance.length, present: studentAttendance.filter(a => a.status === 'present').length, absent: studentAttendance.filter(a => a.status === 'absent').length };

  return (
    <div className="max-w-5xl mx-auto space-y-4 min-w-0 overflow-x-hidden">
      {/* Ust bar */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate('/progress')}><ArrowLeft size={18} /></Button>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{student.firstName} {student.lastName}</h2>
        <Badge variant="outline">{student.grade}</Badge>
      </div>

      {/* Profil karti */}
      <Card className="bg-gradient-to-r from-emerald-50 to-white"><CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-lg font-bold">{student.firstName} {student.lastName}</h3>
              <Badge variant="secondary">{student.grade}</Badge>
              <Badge variant="outline">{school?.name || '-'}</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><span className="text-gray-500 text-xs">Doğum Yılı</span><p className="font-medium">{student.birthYear || '-'}</p></div>
              <div><span className="text-gray-500 text-xs">Yaş</span><p className="font-medium">{student.age || '-'}</p></div>
              <div><span className="text-gray-500 text-xs">Memleket</span><p className="font-medium">{student.city || '-'}</p></div>
              <div><span className="text-gray-500 text-xs">Telefon</span><p className="font-medium">{student.phone || '-'}</p></div>
              <div><span className="text-gray-500 text-xs">Veli</span><p className="font-medium">{student.parentName || '-'}</p></div>
              <div><span className="text-gray-500 text-xs">Veli Tel</span><p className="font-medium">{student.parentPhone || '-'}</p></div>
              <div><span className="text-gray-500 text-xs">E-posta</span><p className="font-medium">{student.email || '-'}</p></div>
              <div><span className="text-gray-500 text-xs">Dersler</span><p className="font-medium">{studentLessons.map(l => l.name).join(', ') || '-'}</p></div>
            </div>
            {/* Mini yoklama ozeti */}
            <div className="flex gap-4 mt-3 pt-3 border-t">
              <div className="text-center"><p className="text-xl font-bold text-green-600">{attStats.present}</p><p className="text-[10px] text-gray-500">Mevcut</p></div>
              <div className="text-center"><p className="text-xl font-bold text-red-600">{attStats.absent}</p><p className="text-[10px] text-gray-500">Yok</p></div>
              <div className="text-center"><p className="text-xl font-bold text-blue-600">{studentProgress.length}</p><p className="text-[10px] text-gray-500">Gelişim</p></div>
              <div className="text-center"><p className="text-xl font-bold text-purple-600">{homeworks.length}</p><p className="text-[10px] text-gray-500">Ödev</p></div>
              <div className="text-center"><p className="text-xl font-bold text-emerald-600">{lessonLogs.length}</p><p className="text-[10px] text-gray-500">Ders</p></div>
            </div>
          </div>
        </div>
      </CardContent></Card>

      {/* Tab bar */}
      <div className="flex border-b bg-white rounded-t-lg px-4 pt-2 yasar-fix">
        <button onClick={() => setActiveTab('info')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}><Users size={16} className="inline mr-1" />Profil</button>
        <button onClick={() => setActiveTab('attendance')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'attendance' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}><ClipboardCheck size={16} className="inline mr-1" />Yoklama Geçmişi</button>
        <button onClick={() => setActiveTab('progress')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'progress' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}><TrendingUp size={16} className="inline mr-1" />Öğrenim Durumu</button>
        <button onClick={() => setActiveTab('homework')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'homework' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}><BookOpen size={16} className="inline mr-1" />Ödevler ({homeworks.length})</button>
        <button onClick={() => setActiveTab('lessonlog')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'lessonlog' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}><NotebookPen size={16} className="inline mr-1" />Ders İşleme ({lessonLogs.length})</button>
        <button onClick={() => setActiveTab('report')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'report' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}><FileText size={16} className="inline mr-1" />Raporlar ({studentReportsList.length})</button>
      </div>

      {/* --- PROFIL TAB --- */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Kişisel Bilgiler</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">TC Kimlik</span><span className="font-medium">{student.tcKimlik || '-'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Ad Soyad</span><span className="font-medium">{student.firstName} {student.lastName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Doğum Yılı</span><span className="font-medium">{student.birthYear || '-'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Yaş</span><span className="font-medium">{student.age || '-'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Memleket</span><span className="font-medium">{student.city || '-'}</span></div>
          </CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">İletişim</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Öğrenci Tel</span><span className="font-medium">{student.phone || '-'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">E-posta</span><span className="font-medium">{student.email || '-'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Veli Adı</span><span className="font-medium">{student.parentName || '-'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Veli Tel</span><span className="font-medium">{student.parentPhone || '-'}</span></div>
          </CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Eğitim</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Okul</span><span className="font-medium">{school?.name || '-'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Sınıf</span><span className="font-medium">{student.grade}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Dersler</span><span className="font-medium">{studentLessons.map(l => l.name).join(', ') || '-'}</span></div>
          </CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Özet</CardTitle></CardHeader><CardContent className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-green-50 p-2 rounded"><p className="text-lg font-bold text-green-700">{attStats.present}</p><p className="text-[10px] text-gray-500">Mevcut</p></div>
              <div className="bg-red-50 p-2 rounded"><p className="text-lg font-bold text-red-700">{attStats.absent}</p><p className="text-[10px] text-gray-500">Yok</p></div>
              <div className="bg-blue-50 p-2 rounded"><p className="text-lg font-bold text-blue-700">{studentProgress.length}</p><p className="text-[10px] text-gray-500">Gelişim</p></div>
              <div className="bg-purple-50 p-2 rounded"><p className="text-lg font-bold text-purple-700">{homeworks.length}</p><p className="text-[10px] text-gray-500">Ödev</p></div>
            </div>
          </CardContent></Card>
        </div>
      )}

      {/* --- YOKLAMA GECMISI TAB --- */}
      {activeTab === 'attendance' && <Card><CardHeader className="pb-3"><CardTitle className="text-base">Yoklama Geçmişi — {studentAttendance.length} kayıt</CardTitle></CardHeader><CardContent className="p-0 overflow-x-auto max-h-[500px] overflow-y-auto">
        {studentAttendance.length > 0 ? <Table><TableHeader><TableRow>
          <TableHead className="text-xs">Tarih</TableHead>
          <TableHead className="text-xs">Ders</TableHead>
          <TableHead className="text-xs">Durum</TableHead>
          <TableHead className="text-xs">Not</TableHead>
        </TableRow></TableHeader><TableBody>{studentAttendance.map(a => {
          const lesson = data.lessons.find(l => l.id === a.lessonId);
          return <TableRow key={a.id}>
            <TableCell className="text-xs">{a.date}</TableCell>
            <TableCell className="text-xs">{lesson?.name || '-'}</TableCell>
            <TableCell><Badge className={`${statusC[a.status]} text-xs`}>{statusL[a.status]}</Badge></TableCell>
            <TableCell className="text-xs text-gray-500">{a.note || '-'}</TableCell>
          </TableRow>;
        })}</TableBody></Table> : <p className="text-center py-8 text-gray-500">Henüz yoklama kaydı yok</p>}
      </CardContent></Card>}

      {/* --- OGRENIM DURUMU TAB --- */}
      {activeTab === 'progress' && <Card><CardHeader className="pb-3"><CardTitle className="text-base">Öğrenim Durumu — {studentProgress.length} kayıt</CardTitle></CardHeader><CardContent className="p-0 overflow-x-auto max-h-[500px] overflow-y-auto">
        {studentProgress.length > 0 ? <Table><TableHeader><TableRow>
          <TableHead className="text-xs">Tarih</TableHead>
          <TableHead className="text-xs text-center">Kuran</TableHead>
          <TableHead className="text-xs text-center">Risale</TableHead>
          <TableHead className="text-xs text-center">Elif-ba</TableHead>
          <TableHead className="text-xs">Notlar</TableHead>
        </TableRow></TableHeader><TableBody>{studentProgress.map(p => (
          <TableRow key={p.id}>
            <TableCell className="text-xs">{p.date}</TableCell>
            <TableCell className="text-xs text-center"><Badge variant="outline" className="text-green-700 border-green-300 text-[10px]">+{p.kuranPages}/S.{p.kuranCurrentPage}</Badge></TableCell>
            <TableCell className="text-xs text-center"><Badge variant="outline" className="text-purple-700 border-purple-300 text-[10px]">+{p.risalePages}/S.{p.risaleCurrentPage}</Badge></TableCell>
            <TableCell className="text-xs text-center"><Badge variant="outline" className="text-orange-700 border-orange-300 text-[10px]">S.{p.elifbaCurrentPage}</Badge></TableCell>
            <TableCell className="text-xs text-gray-500 max-w-[200px] truncate">{p.notes || '-'}</TableCell>
          </TableRow>
        ))}</TableBody></Table> : <p className="text-center py-8 text-gray-500">Henüz gelişim kaydı yok</p>}
      </CardContent></Card>}

      {/* --- DERS ISLEME TAB --- */}
      {activeTab === 'lessonlog' && <Card><CardHeader className="pb-3"><CardTitle className="text-base">Ders İşleme Kayıtları — {lessonLogs.length} kayıt</CardTitle></CardHeader><CardContent className="p-0 overflow-x-auto max-h-[500px] overflow-y-auto">
        {lessonLogs.length > 0 ? <Table><TableHeader><TableRow>
          <TableHead className="text-xs">Tarih</TableHead>
          <TableHead className="text-xs">Kategori</TableHead>
          <TableHead className="text-xs">Konu</TableHead>
          <TableHead className="text-xs">Alt Konu</TableHead>
          <TableHead className="text-xs">Notlar</TableHead>
          <TableHead className="text-xs">Öğretmen</TableHead>
        </TableRow></TableHeader><TableBody>{lessonLogs.map(l => (
          <TableRow key={l.id}>
            <TableCell className="text-xs">{l.date}</TableCell>
            <TableCell><Badge className={`text-[10px] text-white ${l.category === 'ilmihal' ? 'bg-blue-500' : l.category === 'adab' ? 'bg-green-500' : 'bg-purple-500'}`}>{l.category === 'ilmihal' ? 'İlmihal' : l.category === 'adab' ? 'Adab' : 'Tecvid'}</Badge></TableCell>
            <TableCell className="text-xs font-medium">{l.topic}</TableCell>
            <TableCell className="text-xs">{l.subTopic}</TableCell>
            <TableCell className="text-xs text-gray-500 max-w-[200px] truncate">{l.notes || '-'}</TableCell>
            <TableCell className="text-xs text-gray-400">{l.author}</TableCell>
          </TableRow>
        ))}</TableBody></Table> : <p className="text-center py-8 text-gray-500">Henüz ders işleme kaydı yok</p>}
      </CardContent></Card>}

      {/* --- RAPOR TAB --- */}
      {activeTab === 'report' && <div className="space-y-4 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-hidden">
        <div className="space-y-4 w-full min-w-0 pr-0 sm:pr-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <h3 className="text-lg font-bold">Öğrenci Rapor Kartı</h3>
          <div className="flex flex-wrap gap-2 max-w-full">
            <Button variant="outline" size="sm" onClick={() => {
              const items: Record<string, { subject: string; note: string; status: 'iyi' | 'orta' | 'gelisim' | 'baslangic'; score: string }> = {};
              studentLessons.forEach(l => {
                const lessonKey = String(l.id);
                const lessonProgress = data.progress.filter(p => p.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date))[0];
                let subject = l.name;
                let note = lessonProgress ? `Son kayıt: ${lessonProgress.date} - Kuran S.${lessonProgress.kuranCurrentPage}, Risale S.${lessonProgress.risaleCurrentPage}` : 'Henüz kayıt yok';
                let status: 'iyi' | 'orta' | 'gelisim' | 'baslangic' = 'baslangic';
                if (lessonProgress && lessonProgress.kuranCurrentPage > 50) status = 'iyi';
                else if (lessonProgress && lessonProgress.kuranCurrentPage > 20) status = 'orta';
                else if (lessonProgress) status = 'gelisim';
                items[lessonKey] = { subject, note, status, score: '' };
              });
              setReportItems(items);
              setReportOpen(true);
            }}><Plus size={16} className="mr-1" /> Yeni Rapor Ekle</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={16} className="mr-1" /> Yazdır</Button>
            <Button variant="outline" size="sm" className="text-blue-600 border-blue-300 hover:bg-blue-50" onClick={() => {
              const subject = encodeURIComponent(`${student.firstName} ${student.lastName} - Gelişim Raporu`);
              const body = encodeURIComponent(`Merhaba ${student.parentName || student.firstName + ' ' + student.lastName},\n\n${student.firstName} ${student.lastName} adlı öğrencimizin gelişim raporu ekte sunulmaktadır.\n\nMedrese: ${school?.name || '-'}\nSınıf: ${student.grade}\n\n365 Kuran Kuran Mektebi`);
              window.open(`mailto:${student.email || ''}?subject=${subject}&body=${body}`, '_blank');
            }}><Mail size={16} className="mr-1" /> E-Posta</Button>
            <Button variant="outline" size="sm" className="text-green-600 border-green-300 hover:bg-green-50" onClick={() => {
              const text = encodeURIComponent(`365 Kuran Kuran Mektebi - ${student.firstName} ${student.lastName} Gelişim Raporu. Medrese: ${school?.name || '-'}. Detaylı bilgi için bizi arayabilirsiniz.`);
              window.open(`sms:${student.parentPhone || student.phone}?body=${text}`, '_blank');
            }}><Smartphone size={16} className="mr-1" /> SMS</Button>
          </div>
        </div>

        {/* TEK RAPOR DOKUMANI - Tum veriler birlesik */}
        <Card className="print:shadow-none w-full min-w-0">
          <CardContent className="p-6 space-y-6 w-full min-w-0">
            {/* Baslik */}
            <div className="text-center border-b pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <img src="/ots/dist/logo-365.jpg" alt="365 Kuran" className="w-10 h-10 rounded" />
                <h2 className="text-xl font-bold">365 Kuran Kuran Mektebi</h2>
              </div>
              <h3 className="text-lg font-semibold text-gray-700">Öğrenci Değerlendirme Raporu</h3>
              <p className="text-sm text-gray-500 mt-1">{student.firstName} {student.lastName} • {student.grade} • {school?.name || '-'}</p>
            </div>

            {/* 1. Ders Bazli Degerlendirmeler */}
            {studentReportsList.length > 0 && <>
              <div className="w-full min-w-0">
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><FileText size={16} className="text-emerald-600" /> Ders Bazlı Değerlendirmeler</h4>
                <div className="sm:hidden space-y-2">
                  {studentReportsList.flatMap(r => r.items).map((item, idx) => (
                    <div key={idx} className="rounded-lg border bg-white p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium break-words">{item.lessonName}</p>
                          <p className="text-xs text-gray-500 break-words">{item.subject}</p>
                        </div>
                        <Badge className={`text-[10px] text-white ${item.status === 'iyi' ? 'bg-green-500' : item.status === 'orta' ? 'bg-blue-500' : item.status === 'gelisim' ? 'bg-yellow-500' : 'bg-gray-500'}`}>{item.status.toUpperCase()}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold">Puan:</span>
                        <span>{item.score || '-'}</span>
                      </div>
                      <p className="text-xs text-gray-500 break-words">{item.teacherNote || '-'}</p>
                    </div>
                  ))}
                </div>
                <div className="hidden sm:block w-full max-w-full overflow-x-auto">
                <Table className="min-w-[720px]"><TableHeader><TableRow>
                  <TableHead className="text-xs">Ders</TableHead>
                  <TableHead className="text-xs">Konu</TableHead>
                  <TableHead className="text-xs text-center">Durum</TableHead>
                  <TableHead className="text-xs text-center">Puan</TableHead>
                  <TableHead className="text-xs">Öğretmen Notu</TableHead>
                </TableRow></TableHeader><TableBody>
                  {studentReportsList.flatMap(r => r.items).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs font-medium">{item.lessonName}</TableCell>
                      <TableCell className="text-xs">{item.subject}</TableCell>
                      <TableCell className="text-center"><Badge className={`text-[10px] text-white ${item.status === 'iyi' ? 'bg-green-500' : item.status === 'orta' ? 'bg-blue-500' : item.status === 'gelisim' ? 'bg-yellow-500' : 'bg-gray-500'}`}>{item.status.toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-xs text-center font-bold">{item.score || '-'}</TableCell>
                      <TableCell className="text-xs text-gray-500">{item.teacherNote || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table>
                </div>
              </div>

              {/* Genel Degerlendirmeler */}
              {studentReportsList.filter(r => r.generalNote).length > 0 && <div>
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><MessageSquare size={16} className="text-emerald-600" /> Genel Değerlendirmeler</h4>
                <div className="space-y-2">
                  {studentReportsList.filter(r => r.generalNote).map(r => (
                    <div key={r.id} className="p-3 bg-gray-50 rounded text-sm"><span className="text-xs text-gray-400">{r.createdAt} • {r.period}</span><p className="mt-1">{r.generalNote}</p></div>
                  ))}
                </div>
              </div>}
            </>}

            {/* 2. Gelişim Ozeti */}
            <div className="w-full min-w-0">
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-600" /> Öğrenim Durumu Özeti</h4>
              {studentProgress.length > 0 ? <>
                <div className="sm:hidden space-y-2">
                  {studentProgress.slice(0, 10).map(p => (
                    <div key={p.id} className="rounded-lg border bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{p.date}</p>
                        <span className="text-[10px] text-gray-500">Gelişim</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div className="rounded bg-green-50 p-2 text-center"><div className="text-gray-500">Kuran</div><div className="font-semibold text-green-700">+{p.kuranPages}/S.{p.kuranCurrentPage}</div></div>
                        <div className="rounded bg-purple-50 p-2 text-center"><div className="text-gray-500">Risale</div><div className="font-semibold text-purple-700">+{p.risalePages}/S.{p.risaleCurrentPage}</div></div>
                        <div className="rounded bg-orange-50 p-2 text-center"><div className="text-gray-500">Elif-ba</div><div className="font-semibold text-orange-700">S.{p.elifbaCurrentPage}</div></div>
                      </div>
                      <p className="text-xs text-gray-500 break-words">{p.notes || '-'}</p>
                    </div>
                  ))}
                </div>
                <div className="hidden sm:block w-full max-w-full overflow-x-auto"><Table className="min-w-[720px]"><TableHeader><TableRow>
                <TableHead className="text-xs">Tarih</TableHead>
                <TableHead className="text-xs text-center">Kuran</TableHead>
                <TableHead className="text-xs text-center">Risale</TableHead>
                <TableHead className="text-xs text-center">Elif-ba</TableHead>
                <TableHead className="text-xs">Notlar</TableHead>
              </TableRow></TableHeader><TableBody>
                {studentProgress.slice(0, 10).map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{p.date}</TableCell>
                    <TableCell className="text-xs text-center"><Badge variant="outline" className="text-green-700 border-green-300 text-[10px]">+{p.kuranPages}/S.{p.kuranCurrentPage}</Badge></TableCell>
                    <TableCell className="text-xs text-center"><Badge variant="outline" className="text-purple-700 border-purple-300 text-[10px]">+{p.risalePages}/S.{p.risaleCurrentPage}</Badge></TableCell>
                    <TableCell className="text-xs text-center"><Badge variant="outline" className="text-orange-700 border-orange-300 text-[10px]">S.{p.elifbaCurrentPage}</Badge></TableCell>
                    <TableCell className="text-xs text-gray-500 max-w-[200px] truncate">{p.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></div></> : <p className="text-sm text-gray-500">Henüz gelişim kaydı yok</p>}
            </div>

            {/* 3. Yoklama Ozeti */}
            <div className="w-full min-w-0">
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><ClipboardCheck size={16} className="text-emerald-600" /> Yoklama Özeti</h4>
              {studentAttendance.length > 0 ? <div className="flex flex-wrap gap-2">
                {studentAttendance.slice(0, 30).map(a => (
                  <div key={a.id} className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold text-white ${a.status === 'present' ? 'bg-green-500' : a.status === 'absent' ? 'bg-red-500' : a.status === 'late' ? 'bg-yellow-500' : 'bg-blue-500'}`} title={`${a.date} - ${statusL[a.status]}`}>
                    {a.date.slice(8)}
                  </div>
                ))}
                <div className="flex items-center gap-3 ml-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Mevcut: {studentAttendance.filter(a => a.status === 'present').length}</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Yok: {studentAttendance.filter(a => a.status === 'absent').length}</span>
                </div>
              </div> : <p className="text-sm text-gray-500">Henüz yoklama kaydı yok</p>}
            </div>

            {/* 4. Odev Ozeti */}
            <div className="w-full min-w-0">
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><BookOpen size={16} className="text-emerald-600" /> Ödev Durumu</h4>
              {homeworks.length > 0 ? <div className="flex flex-wrap gap-2">
                {homeworks.map(h => (
                  <Badge key={h.id} variant={h.completed ? 'default' : 'outline'} className={`text-xs ${h.completed ? 'bg-green-600' : ''}`}>
                    {h.completed ? '✓' : '○'} {h.title}
                  </Badge>
                ))}
                <span className="text-xs text-gray-500 ml-2">Tamamlanan: {homeworks.filter(h => h.completed).length}/{homeworks.length}</span>
              </div> : <p className="text-sm text-gray-500">Henüz ödev atanmamış</p>}
            </div>

            {/* Alt bilgi */}
            <div className="border-t pt-4 text-center text-xs text-gray-400">
              <p>365 Kuran Kuran Mektebi • {new Date().toLocaleDateString('tr-TR')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Rapor Olusturma Dialog */}
        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto w-[95vw] sm:w-full">
            <DialogHeader><DialogTitle>Öğrenci Raporu Ekle</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Dönem</Label>
                  <Select value={reportPeriod} onValueChange={setReportPeriod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Günlük">Günlük</SelectItem>
                      <SelectItem value="Haftalık">Haftalık</SelectItem>
                      <SelectItem value="Aylık">Aylık</SelectItem>
                      <SelectItem value="Dönemlik">Dönemlik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Öğrenci</Label><Input value={`${student.firstName} ${student.lastName}`} disabled className="bg-gray-100" /></div>
              </div>
              <div className="space-y-2">
                {studentLessons.map(l => {
                  const key = String(l.id);
                  const item = reportItems[key] || { subject: l.name, note: '', status: 'baslangic' as const, score: '' };
                  return (
                    <Card key={l.id} className="p-3"><div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">{l.name}</Badge>
                      <Select value={item.status} onValueChange={v => setReportItems(prev => ({ ...prev, [key]: { ...item, status: v as typeof item.status } }))}>
                        <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iyi">İyi</SelectItem>
                          <SelectItem value="orta">Orta</SelectItem>
                          <SelectItem value="gelisim">Gelişim</SelectItem>
                          <SelectItem value="baslangic">Başlangıç</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="number" className="h-7 text-xs w-20" placeholder="Puan" value={item.score} onChange={e => setReportItems(prev => ({ ...prev, [key]: { ...item, score: e.target.value } }))} />
                    </div>
                      <Input className="h-7 text-xs" placeholder="Konu / Alt ders" value={item.subject} onChange={e => setReportItems(prev => ({ ...prev, [key]: { ...item, subject: e.target.value } }))} />
                      <Textarea className="text-xs mt-1" placeholder="Öğretmen notu..." rows={1} value={item.note} onChange={e => setReportItems(prev => ({ ...prev, [key]: { ...item, note: e.target.value } }))} />
                    </Card>
                  );
                })}
              </div>
              <div className="space-y-1 w-full min-w-0"><Label className="text-xs">Genel Değerlendirme</Label><Textarea value={reportNote} onChange={e => setReportNote(e.target.value)} placeholder="Öğrenci hakkında genel değerlendirme..." rows={3} /></div>
              <div className="flex gap-2">
                <Button onClick={() => {
                  const items = Object.entries(reportItems).map(([lessonId, item]) => {
                    const lesson = data.lessons.find(l => String(l.id) === lessonId);
                    return { lessonName: lesson?.name || '', subject: item.subject, teacherNote: item.note, score: item.score ? Number(item.score) : undefined, status: item.status };
                  });
                  data.addStudentReport({ studentId: student.id, title: `${student.firstName} ${student.lastName} - ${reportPeriod} Rapor`, period: reportPeriod, items, generalNote: reportNote });
                  setReportOpen(false);
                  setReportNote('');
                  setReportPeriod('Aylık');
                  alert('Rapor eklendi');
                }} className="flex-1"><Save size={16} className="mr-1" /> Rapor Ekle</Button>
                <Button variant="outline" onClick={() => setReportOpen(false)}>İptal</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>}

      {/* --- ODEVLER TAB --- */}
      {activeTab === 'homework' && <div className="space-y-3">
        {homeworks.length > 0 ? homeworks.map(h => (
          <Card key={h.id} className={h.completed ? 'border-green-300 bg-green-50/30' : ''}><CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Yapti / YapmadI checkbox */}
              <div className="pt-0.5">
                <button type="button" onClick={() => data.toggleHomeworkCompleted(h.id)} className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${h.completed ? 'bg-green-500 text-white' : 'border-2 border-gray-300 hover:border-green-400'}`} title={h.completed ? 'Tamamlandı' : 'Yapılmadı'}>
                  {h.completed && <CheckCircle2 size={16} />}
                </button>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{h.type === 'ezber' ? 'Ezber' : h.type === 'okuma-kuran' ? 'Kuran' : h.type === 'okuma-risale' ? 'Risale' : 'Diğer'}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{h.createdAt}</Badge>
                  <span className="text-xs text-gray-500">{h.author}</span>
                  {h.completed && h.completedAt && <Badge variant="outline" className="text-green-600 border-green-300 text-[10px]">{h.completedAt}</Badge>}
                </div>
                <p className="text-sm font-medium">{h.title}</p>
                <p className="text-xs text-gray-600">{h.content} {h.details ? <span className="text-emerald-600 font-medium">({h.details})</span> : ''}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => { if (confirm('Ödev silinsin mi?')) data.deleteHomeworkAssignment(h.id); }}><Trash2 size={14} className="text-red-500" /></Button>
            </div>
          </CardContent></Card>
        )) : <Card><CardContent className="p-8 text-center text-gray-500">Henüz ödev atanmamış</CardContent></Card>}
      </div>}
    </div>
  );
}

// ====== HOMEWORK TEMPLATES PAGE ======
function HomeworkTemplatesPage() {
  const data = useStudentData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HomeworkTemplate | null>(null);
  const [form, setForm] = useState<Partial<HomeworkTemplate>>({ type: 'ezber', active: true });

  const handleSubmit = () => {
    if (!form.title || !form.content) return;
    if (editing) data.updateHomeworkTemplate(editing.id, form);
    else data.addHomeworkTemplate(form as Omit<HomeworkTemplate, 'id'>);
    setOpen(false); setEditing(null); setForm({ type: 'ezber', active: true });
  };

  const typeColors: Record<string, string> = { ezber: 'bg-purple-100 text-purple-700', 'okuma-kuran': 'bg-green-100 text-green-700', 'okuma-risale': 'bg-orange-100 text-orange-700', diger: 'bg-gray-100 text-gray-700' };
  const typeLabels: Record<string, string> = { ezber: 'Ezber', 'okuma-kuran': 'Kuran Okuma', 'okuma-risale': 'Risale Okuma', diger: 'Diğer' };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h2 className="text-xl sm:text-2xl font-bold text-gray-900">Ödev Tanımları</h2><Button onClick={() => { setEditing(null); setForm({ type: 'ezber', active: true }); setOpen(true); }}><Plus size={18} className="mr-1" /> Ödev Ekle</Button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.homeworkTemplates.map(t => (
          <Card key={t.id} className={t.active ? '' : 'opacity-50'}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={`${typeColors[t.type || 'diger']} text-[10px]`}>{typeLabels[t.type || 'diger']}</Badge>
                  {t.active ? <Badge variant="outline" className="text-green-600 border-green-300 text-[10px]">Aktif</Badge> : <Badge variant="outline" className="text-gray-400 text-[10px]">Pasif</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(t); setForm(t); setOpen(true); }}><Pencil size={14} /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm('Ödev tanımı silinsin mi?')) data.deleteHomeworkTemplate(t.id); }}><Trash2 size={14} className="text-red-500" /></Button>
                </div>
              </div>
              <CardTitle className="text-sm mt-2">{t.title}</CardTitle>
              <CardDescription className="text-xs">{t.content} {t.details ? <span className="font-medium">({t.details} sayfa)</span> : ''}</CardDescription>
            </CardHeader>
          </Card>
        ))}
        {data.homeworkTemplates.length === 0 && <p className="text-center py-8 text-gray-500 col-span-3">Henüz ödev tanımı yok</p>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Ödev Düzenle' : 'Yeni Ödev Tanımı'}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-4">
            <div className="space-y-1"><Label className="text-xs">Ödev Tipi *</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as HomeworkTemplate['type'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ezber">Ezber</SelectItem>
                  <SelectItem value="okuma-kuran">Kuran Okuma</SelectItem>
                  <SelectItem value="okuma-risale">Risale Okuma</SelectItem>
                  <SelectItem value="diger">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Başlık *</Label><Input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Örn: Fatiha Suresi Ezberi" /></div>
            <div className="space-y-1"><Label className="text-xs">İçerik *</Label><Textarea value={form.content || ''} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Ödev açıklaması..." rows={2} /></div>
            <div className="space-y-1"><Label className="text-xs">Detay (sayfa sayısı vb.)</Label><Input value={form.details || ''} onChange={e => setForm({ ...form, details: e.target.value })} placeholder="Örn: 5" /></div>
            <div className="flex items-center gap-2"><Switch checked={form.active ?? true} onCheckedChange={v => setForm({ ...form, active: v })} /><Label className="text-xs">Aktif</Label></div>
            <Button onClick={handleSubmit} className="w-full">{editing ? 'Güncelle' : 'Ekle'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ====== APP ROUTER ======
function AppRouter() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Login sonrasi role gore yonlendirme
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    // Teacher: sadece /progress ve /student-profile erisir
    if (role === 'teacher') {
      if (!location.pathname.startsWith('/progress') && !location.pathname.startsWith('/student-profile')) {
        navigate('/progress', { replace: true });
      }
      return;
    }

    // Yetkili ogretmen: sadece varsayilan acilista /progress'e yonlendir
    if (role === 'authorized_teacher' && location.pathname === '/') {
      navigate('/progress', { replace: true });
    }
  }, [currentUser, location.pathname, navigate]);

  if (!currentUser) return <Routes><Route path="/login" element={<LoginPage />} /><Route path="*" element={<Navigate to="/login" />} /></Routes>;
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={
          currentUser.role === 'superadmin' || currentUser.role === 'admin'
            ? <DashboardPage />
            : currentUser.role === 'authorized_teacher' || currentUser.role === 'teacher'
              ? <Navigate to="/progress" replace />
              : <Navigate to="/students" replace />
        } />
        <Route path="/students" element={<AuthGuard requiredRoles={['superadmin', 'admin', 'authorized_teacher', 'parent']}><StudentsPage /></AuthGuard>} />
        <Route path="/student-form" element={<AuthGuard requiredRoles={PERMISSIONS.STUDENT_CREATE}><StudentFormPage /></AuthGuard>} />
        <Route path="/student-form/:id" element={<AuthGuard requiredRoles={PERMISSIONS.STUDENT_EDIT}><StudentFormPage /></AuthGuard>} />
        <Route path="/schools" element={<AuthGuard requiredRoles={PERMISSIONS.SCHOOL_MANAGE}><SchoolsPage /></AuthGuard>} />
        <Route path="/lessons" element={<AuthGuard requiredRoles={PERMISSIONS.LESSON_MANAGE}><LessonsPage /></AuthGuard>} />
        <Route path="/classes" element={<AuthGuard requiredRoles={['superadmin', 'admin', 'authorized_teacher']}><ClassesPage /></AuthGuard>} />
        <Route path="/attendance" element={<AuthGuard requiredRoles={['superadmin', 'admin', 'authorized_teacher']}><AttendancePage /></AuthGuard>} />
        <Route path="/progress" element={<AuthGuard requiredRoles={PERMISSIONS.PROGRESS_CREATE}><ProgressPage /></AuthGuard>} />
        <Route path="/teacher-lessons" element={<AuthGuard requiredRoles={['superadmin']}><TeacherLessonsPage /></AuthGuard>} />
        <Route path="/comments" element={<AuthGuard requiredRoles={['superadmin', 'admin', 'authorized_teacher']}><CommentsPage /></AuthGuard>} />
        <Route path="/reports" element={<AuthGuard requiredRoles={PERMISSIONS.REPORT_CREATE}><ReportsPage /></AuthGuard>} />
        <Route path="/permissions" element={<AuthGuard requiredRoles={PERMISSIONS.PERMISSION_MANAGE}><PermissionsPage /></AuthGuard>} />
        <Route path="/users" element={<AuthGuard requiredRoles={PERMISSIONS.USER_MANAGE}><UsersPage /></AuthGuard>} />
        <Route path="/surveys" element={<AuthGuard requiredRoles={['superadmin', 'admin']}><SurveyManagementPage /></AuthGuard>} />
        <Route path="/homework-templates" element={<AuthGuard requiredRoles={['superadmin', 'admin']}><HomeworkTemplatesPage /></AuthGuard>} />
        <Route path="/student-profile/:id" element={<StudentProfilePage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </MainLayout>
  );
}

export default AppRouter;