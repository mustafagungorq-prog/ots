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

// ====== LESSONS PAGE (2 Grid) ======
export function LessonsPage() {
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