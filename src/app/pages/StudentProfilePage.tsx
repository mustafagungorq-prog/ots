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
import { apiPost } from '@/hooks/useApi';
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

// ====== STUDENT PROFILE PAGE ======
export function StudentProfilePage() {
  const data = useStudentData();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const profileId = Number(id);
  const isParent = currentUser?.role === 'parent';
  const canManageReports = !isParent;
  const parentStudentId = isParent ? currentUser?.linkedStudentIds?.[0] : undefined;

  if (isParent && parentStudentId && profileId !== parentStudentId) {
    return <Navigate to={`/student-profile/${parentStudentId}`} replace />;
  }

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

  const studentMemorization = data.memorizationTracking
    .filter(m => m.studentId === student.id)
    .map(m => {
      const text = data.memorizationTexts.find(t => t.id === m.textId);
      return {
        ...m,
        textTitle: text?.title || `Metin #${m.textId}`,
      };
    })
    .sort((a, b) => ((b.checkedAt || b.updatedAt || '') as string).localeCompare((a.checkedAt || a.updatedAt || '') as string));

  // Ders isleme kayitlari
  const lessonLogs = data.getStudentLessonLogs(student.id);

  const statusC: Record<string, string> = { present: 'bg-green-500', absent: 'bg-red-500', late: 'bg-yellow-500', excused: 'bg-blue-500' };
  const statusL: Record<string, string> = { present: 'Mevcut', absent: 'Yok', late: 'Geç', excused: 'İzinli' };

  // Yoklama ozeti
  const attStats = { total: studentAttendance.length, present: studentAttendance.filter(a => a.status === 'present').length, absent: studentAttendance.filter(a => a.status === 'absent').length };

  const buildReportMailBody = () => {
    const lessonsText = studentLessons.map(l => l.name).join(', ') || '-';
    const latestProgress = studentProgress[0];
    const teacherComments = data.comments
      .filter(c => c.studentId === student.id && c.type === 'teacher')
      .slice(0, 3)
      .map(c => `- ${c.createdAt}: ${c.content}`)
      .join('\n') || '- Yok';

    return [
      `SAYIN ${student.parentName || student.firstName + ' ' + student.lastName},`,
      '',
      `${student.firstName} ${student.lastName} için Son 30 gün:`,
      '',
      'ÖĞRENCİ:',
      `- Ad: ${student.firstName} ${student.lastName}`,
      `- Sınıf: ${student.grade}`,
      `- Okul: ${school?.name || '-'}`,
      `- Dersler: ${lessonsText}`,
      '',
      'KURAN:',
      latestProgress ? `- Son: ${latestProgress.kuranCurrentPage}\n- Okunan: ${latestProgress.kuranPages}` : '- Yok',
      '',
      'RİSALE:',
      latestProgress ? `- Son: ${latestProgress.risaleCurrentPage}\n- Okunan: ${latestProgress.risalePages}` : '- Yok',
      '',
      'ELİF-BA:',
      latestProgress ? `- Son: ${latestProgress.elifbaCurrentPage}` : '- Yok',
      '',
      'YOKLAMA:',
      `- Toplam: ${studentAttendance.length}, Mevcut: ${studentAttendance.filter(a => a.status === 'present').length}, İzinli: ${studentAttendance.filter(a => a.status === 'excused').length}, Geç: ${studentAttendance.filter(a => a.status === 'late').length}, Yok: ${studentAttendance.filter(a => a.status === 'absent').length}`,
      '',
      'YORUMLAR:',
      teacherComments,
    ].join('\n');
  };

  const buildReportMailHtml = () => {
    const lessonsText = studentLessons.map(l => l.name).join(', ') || '-';
    const latestProgress = studentProgress[0];
    const teacherComments = data.comments
      .filter(c => c.studentId === student.id && c.type === 'teacher')
      .slice(0, 3);

    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const commentsHtml = teacherComments.length > 0
      ? `<ul style="margin:0;padding-left:18px;">${teacherComments.map(c => `<li><strong>${esc(c.createdAt)}</strong>: ${esc(c.content)}</li>`).join('')}</ul>`
      : '<span>- Yok</span>';

    const infoRow = (label: string, value: string) => `<tr><td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f8fafc;width:170px;"><strong>${esc(label)}</strong></td><td style="padding:8px 10px;border:1px solid #e5e7eb;">${esc(value)}</td></tr>`;

    return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gelişim Raporu</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="max-width:760px;margin:24px auto;padding:0 12px;">
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="padding:18px 20px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-bottom:1px solid #d1fae5;">
        <h1 style="margin:0;font-size:20px;line-height:1.3;">365 Kuran Kuran Mektebi</h1>
        <p style="margin:6px 0 0 0;font-size:14px;color:#065f46;">Öğrenci Gelişim Raporu</p>
      </div>
      <div style="padding:20px;">
        <p style="margin:0 0 12px 0;font-size:14px;">Sayın <strong>${esc(student.parentName || `${student.firstName} ${student.lastName}`)}</strong>,</p>
        <p style="margin:0 0 16px 0;font-size:14px;">${esc(student.firstName)} ${esc(student.lastName)} için son 30 günlük gelişim özeti aşağıdadır.</p>

        <h3 style="margin:0 0 8px 0;font-size:14px;color:#065f46;">Öğrenci Bilgileri</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px;">
          ${infoRow('Ad Soyad', `${student.firstName} ${student.lastName}`)}
          ${infoRow('Sınıf', student.grade || '-')}
          ${infoRow('Okul', school?.name || '-')}
          ${infoRow('Dersler', lessonsText)}
        </table>

        <h3 style="margin:0 0 8px 0;font-size:14px;color:#065f46;">Öğrenim Durumu</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px;">
          ${infoRow('Kuran', latestProgress ? `Son: ${latestProgress.kuranCurrentPage} / Okunan: ${latestProgress.kuranPages}` : 'Kayıt yok')}
          ${infoRow('Risale', latestProgress ? `Son: ${latestProgress.risaleCurrentPage} / Okunan: ${latestProgress.risalePages}` : 'Kayıt yok')}
          ${infoRow('Elif-ba', latestProgress ? `Son: ${latestProgress.elifbaCurrentPage}` : 'Kayıt yok')}
          ${infoRow('Yoklama Özeti', `Toplam: ${studentAttendance.length}, Mevcut: ${studentAttendance.filter(a => a.status === 'present').length}, İzinli: ${studentAttendance.filter(a => a.status === 'excused').length}, Geç: ${studentAttendance.filter(a => a.status === 'late').length}, Yok: ${studentAttendance.filter(a => a.status === 'absent').length}`)}
        </table>

        <h3 style="margin:0 0 8px 0;font-size:14px;color:#065f46;">Öğretmen Yorumları</h3>
        <div style="font-size:13px;line-height:1.5;">${commentsHtml}</div>

        <p style="margin:18px 0 0 0;font-size:12px;color:#6b7280;">Bu e-posta 365 Kuran Kuran Mektebi öğrenci takip sistemi tarafından oluşturulmuştur.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const sendStyledReportMail = async () => {
    if (!student.email) {
      alert('Öğrencinin e-posta adresi bulunmuyor');
      return;
    }

    const subjectRaw = `${student.firstName} ${student.lastName} - Gelişim Raporu`;
    const bodyText = buildReportMailBody();
    const bodyHtml = buildReportMailHtml();

    try {
      await apiPost('mail/student-report', {
        to: student.email,
        subject: subjectRaw,
        html: bodyHtml,
        text: bodyText,
      });
      alert('E-posta tasarımlı formatta gönderildi.');
    } catch (err: any) {
      const subject = encodeURIComponent(subjectRaw);
      const body = encodeURIComponent(bodyText);
      window.open(`mailto:${student.email}?subject=${subject}&body=${body}`, '_blank');
      alert(`Mail servisi kullanılamadı (${err?.message || 'hata'}). Taslak, e-posta uygulamasında açıldı.`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 min-w-0 overflow-x-hidden">
      {/* Ust bar */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate(isParent ? `/student-profile/${parentStudentId ?? 0}` : '/progress')}><ArrowLeft size={18} /></Button>
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
            {canManageReports && <Button variant="outline" size="sm" onClick={() => {
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
            }}><Plus size={16} className="mr-1" /> Yeni Rapor Ekle</Button>}
            {canManageReports && <Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={16} className="mr-1" /> Yazdır</Button>}
            <Button variant="outline" size="sm" className="text-blue-600 border-blue-300 hover:bg-blue-50" onClick={sendStyledReportMail}><Mail size={16} className="mr-1" /> E-Posta</Button>
            {canManageReports && <Button variant="outline" size="sm" className="text-green-600 border-green-300 hover:bg-green-50" onClick={() => {
              const text = encodeURIComponent(`365 Kuran Kuran Mektebi - ${student.firstName} ${student.lastName} Gelişim Raporu. Medrese: ${school?.name || '-'}. Detaylı bilgi için bizi arayabilirsiniz.`);
              window.open(`sms:${student.parentPhone || student.phone}?body=${text}`, '_blank');
            }}><Smartphone size={16} className="mr-1" /> SMS</Button>}
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

            {/* 5. Ezber Takibi Ozeti */}
            <div className="w-full min-w-0">
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><ListChecks size={16} className="text-emerald-600" /> Ezber Takibi Özeti</h4>
              {studentMemorization.length > 0 ? <>
                <div className="mb-3 flex flex-wrap gap-2 text-xs">
                  <Badge className="bg-green-600">Tamamladı: {studentMemorization.filter(m => m.status === 'completed').length}</Badge>
                  <Badge className="bg-amber-500">Tekrarlanacak: {studentMemorization.filter(m => m.status === 'repeat').length}</Badge>
                  <Badge className="bg-red-600">Tamamlanmadı: {studentMemorization.filter(m => m.status === 'not_completed').length}</Badge>
                </div>
                <div className="sm:hidden space-y-2">
                  {studentMemorization.map(m => (
                    <div key={m.id} className="rounded-lg border bg-white p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium break-words">{m.textTitle}</p>
                        <Badge className={`text-[10px] text-white ${m.status === 'completed' ? 'bg-green-500' : m.status === 'repeat' ? 'bg-amber-500' : 'bg-red-500'}`}>
                          {m.status === 'completed' ? 'TAMAMLADI' : m.status === 'repeat' ? 'TEKRARLANACAK' : 'TAMAMLANMADI'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 break-words">{m.teacherNote || '-'}</p>
                      <p className="text-[10px] text-gray-400">Kontrol: {m.checkedAt || '-'}</p>
                    </div>
                  ))}
                </div>
                <div className="hidden sm:block w-full max-w-full overflow-x-auto">
                  <Table className="min-w-[720px]"><TableHeader><TableRow>
                    <TableHead className="text-xs">Ezber Metni</TableHead>
                    <TableHead className="text-xs text-center">Durum</TableHead>
                    <TableHead className="text-xs">Öğretmen Notu</TableHead>
                    <TableHead className="text-xs">Kontrol Tarihi</TableHead>
                  </TableRow></TableHeader><TableBody>
                    {studentMemorization.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs font-medium">{m.textTitle}</TableCell>
                        <TableCell className="text-center"><Badge className={`text-[10px] text-white ${m.status === 'completed' ? 'bg-green-500' : m.status === 'repeat' ? 'bg-amber-500' : 'bg-red-500'}`}>{m.status === 'completed' ? 'Tamamladı' : m.status === 'repeat' ? 'Tekrarlanacak' : 'Tamamlanmadı'}</Badge></TableCell>
                        <TableCell className="text-xs text-gray-500">{m.teacherNote || '-'}</TableCell>
                        <TableCell className="text-xs">{m.checkedAt || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody></Table>
                </div>
              </> : <p className="text-sm text-gray-500">Henüz ezber takip kaydı yok</p>}
            </div>

            {/* Alt bilgi */}
            <div className="border-t pt-4 text-center text-xs text-gray-400">
              <p>365 Kuran Kuran Mektebi • {new Date().toLocaleDateString('tr-TR')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Rapor Olusturma Dialog */}
        {canManageReports && <Dialog open={reportOpen} onOpenChange={setReportOpen}>
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
        </Dialog>}
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