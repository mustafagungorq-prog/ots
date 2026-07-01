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

// ====== ATTENDANCE PAGE ======
export function AttendancePage() {
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