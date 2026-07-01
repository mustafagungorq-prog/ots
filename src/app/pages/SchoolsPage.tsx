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

// ====== SCHOOLS PAGE ======
export function SchoolsPage() {
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