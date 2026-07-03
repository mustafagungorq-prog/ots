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

// ====== REPORTS PAGE ======
export function ReportsPage() {
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
  const filteredStudents = useMemo(() => {
    const lessonFilterActive = !!selLesson;
    const lessonId = lessonFilterActive ? Number(selLesson) : null;
    const gradeFilterActive = !!selGrade;
    return data.students.filter(s => {
      if (lessonFilterActive && lessonId && !s.lessons.includes(lessonId)) return false;
      if (gradeFilterActive && s.grade !== selGrade) return false;
      return true;
    });
  }, [selLesson, selGrade, data.students]);
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
    const sentViaForApi = sendVia.includes('email') && sendVia.includes('sms')
      ? 'both'
      : (sendVia.includes('sms') ? 'sms' : 'email');
    data.addReport({ studentId: Number(selStudent), type: reportType, periodStart: start, periodEnd: now, content: preview, sentVia: sentViaForApi });
    setShowPreview(false); setPreview('');
  };
  const toggleSendVia = (m: string) => setSendVia(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m]);
  const getSendViaLabel = (r: any) => {
    const value = r?.sentVia ?? r?.sent_via;
    if (Array.isArray(value)) return value.join(' + ').toUpperCase();
    if (typeof value === 'string') {
      if (value === 'both') return 'EMAIL + SMS';
      if (value.includes(',')) return value.split(',').map((x: string) => x.trim().toUpperCase()).join(' + ');
      return value.toUpperCase();
    }
    return '-';
  };
  const getReportDate = (r: any) => r?.sentAt || r?.createdAt || r?.created_at || '-';
  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Raporlar</h2>
      <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText size={18} /> Gelişim Raporu</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1"><Label className="text-xs">Ders Filtresi</Label><Select value={selLesson || 'all'} onValueChange={v => { setSelLesson(v === 'all' ? '' : v); setSelStudent(''); }}><SelectTrigger><SelectValue placeholder="Ders (opsiyonel)" /></SelectTrigger><SelectContent><SelectItem value="all">Tümü</SelectItem>{data.lessons.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs">Sınıf Filtresi</Label><Select value={selGrade || 'all'} onValueChange={v => { setSelGrade(v === 'all' ? '' : v); setSelStudent(''); }}><SelectTrigger><SelectValue placeholder="Sınıf (opsiyonel)" /></SelectTrigger><SelectContent><SelectItem value="all">Tümü</SelectItem>{grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
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
        {canViewColumn('reports', 'date') && <TableCell className="text-xs">{getReportDate(r)}</TableCell>}
        {canViewColumn('reports', 'student') && <TableCell className="font-medium text-xs">{s?.firstName} {s?.lastName}</TableCell>}
        {canViewColumn('reports', 'type') && <TableCell className="text-xs">{r.type === 'daily' ? 'Günlük' : r.type === 'weekly' ? 'Haftalık' : 'Aylık'}</TableCell>}
        {canViewColumn('reports', 'method') && <TableCell className="text-xs">{getSendViaLabel(r)}</TableCell>}
        {canViewColumn('reports', 'status') && <TableCell><Badge variant={r.status === 'sent' ? 'default' : 'outline'} className="text-xs">{r.status === 'sent' ? 'Gönderildi' : 'Taslak'}</Badge></TableCell>}
        {canViewColumn('reports', 'actions') && <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => data.deleteReport(r.id)}><Trash2 size={14} className="text-red-500" /></Button></TableCell>}
      </TableRow>; })}{data.reports.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Henüz rapor yok</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
    </div>
  );
}