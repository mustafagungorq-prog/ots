// @ts-nocheck
import { useState, useMemo, useEffect } from 'react';
import { Navigate, useNavigate, useLocation, useParams, Link } from 'react-router';
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

export const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin', admin: 'Admin',
  authorized_teacher: 'Yetkili Öğr.', teacher: 'Öğretmen', parent: 'Veli'
};
export const ROLE_COLORS: Record<UserRole, string> = {
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

// ====== DASHBOARD ======
export function DashboardPage() {
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