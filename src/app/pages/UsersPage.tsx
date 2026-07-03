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

// ====== USERS PAGE ======
export function UsersPage() {
  const data = useStudentData();
  const { users, changePassword, currentUser, addUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPass, setNewPass] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<User>>({ active: true, role: 'teacher' });
  const [selectedParentStudentId, setSelectedParentStudentId] = useState<string>('');
  const getDisplayName = (u: any) => u?.fullName || u?.full_name || u?.username || '-';
  const handleChangePassword = () => { if (!selectedUser || !newPass) return; changePassword(selectedUser.id, newPass); setOpen(false); setSelectedUser(null); setNewPass(''); };
  const handleCreateUser = async () => {
    if (!createForm.username || !createForm.password || !createForm.fullName || !createForm.role) return;
    if (createForm.role === 'parent' && !selectedParentStudentId) return;

    const createdUserId = await addUser(createForm as Omit<User, 'id'>);
    if (createForm.role === 'parent' && createdUserId && selectedParentStudentId) {
      await apiPost('parent-student-links', {
        parentUserId: createdUserId,
        studentId: Number(selectedParentStudentId),
      });
    }

    setCreateOpen(false);
    setShowPw(false);
    setCreateForm({ active: true, role: 'teacher' });
    setSelectedParentStudentId('');
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Kullanıcılar</h2>
        <Button onClick={() => setCreateOpen(true)}><Plus size={18} className="mr-1" /> Kullanıcı Ekle</Button>
      </div>
      <Card><CardContent className="p-0 overflow-x-auto"><Table>
        <TableHeader><TableRow><TableHead className="text-xs">Kullanıcı</TableHead><TableHead className="text-xs">Ad Soyad</TableHead><TableHead className="text-xs">Rol</TableHead><TableHead className="text-xs">E-posta</TableHead><TableHead className="text-xs">Telefon</TableHead><TableHead className="text-xs">Durum</TableHead><TableHead className="text-xs">İşlem</TableHead></TableRow></TableHeader>
        <TableBody>{users.map(u => <TableRow key={u.id} className={u.id === currentUser?.id ? 'bg-blue-50' : ''}>
          <TableCell className="font-medium text-sm">{u.username}{u.id === currentUser?.id && <Badge variant="outline" className="text-[10px] ml-1">Siz</Badge>}</TableCell>
          <TableCell className="text-sm">{getDisplayName(u)}</TableCell>
          <TableCell><Badge className={`${ROLE_COLORS[u.role]} text-white text-xs`}>{ROLE_LABELS[u.role]}</Badge></TableCell>
          <TableCell className="text-sm">{u.email}</TableCell>
          <TableCell className="text-sm">{u.phone}</TableCell>
          <TableCell><Badge variant={u.active ? 'default' : 'secondary'} className="text-xs">{u.active ? 'Aktif' : 'Pasif'}</Badge></TableCell>
          <TableCell><Button variant="ghost" size="sm" onClick={() => { setSelectedUser(u); setOpen(true); }}><Shield size={14} className="mr-1" /> Şifre Değiştir</Button></TableCell>
        </TableRow>)}</TableBody>
      </Table></CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Şifre Değiştir - {selectedUser ? getDisplayName(selectedUser) : ''}</DialogTitle></DialogHeader><div className="space-y-3 pt-4"><div className="space-y-1"><Label className="text-xs">Yeni Şifre</Label><Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} /></div><Button onClick={handleChangePassword} className="w-full">Değiştir</Button></div></DialogContent></Dialog>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Yeni Kullanıcı</DialogTitle></DialogHeader><div className="space-y-3 pt-4">
        <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><Label className="text-xs">Kullanıcı Adı *</Label><Input value={createForm.username || ''} onChange={e => setCreateForm({ ...createForm, username: e.target.value })} /></div><div className="space-y-1"><Label className="text-xs">Ad Soyad *</Label><Input value={createForm.fullName || ''} onChange={e => setCreateForm({ ...createForm, fullName: e.target.value })} /></div></div>
        <div className="space-y-1"><Label className="text-xs">Rol *</Label><Select value={createForm.role || 'teacher'} onValueChange={v => {
          const nextRole = v as UserRole;
          setCreateForm({ ...createForm, role: nextRole });
          if (nextRole !== 'parent') setSelectedParentStudentId('');
        }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
        {createForm.role === 'parent' && (
          <div className="space-y-1">
            <Label className="text-xs">Öğrenciyi Eşleştir *</Label>
            <Select value={selectedParentStudentId} onValueChange={setSelectedParentStudentId}>
              <SelectTrigger><SelectValue placeholder="Öğrenci seçin" /></SelectTrigger>
              <SelectContent>
                {data.students.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1"><Label className="text-xs">Şifre *</Label><div className="relative"><Input type={showPw ? 'text' : 'password'} value={createForm.password || ''} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
        <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><Label className="text-xs">E-posta</Label><Input value={createForm.email || ''} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} /></div><div className="space-y-1"><Label className="text-xs">Telefon</Label><Input value={createForm.phone || ''} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} /></div></div>
        <div className="flex items-center gap-2"><Switch checked={createForm.active ?? true} onCheckedChange={v => setCreateForm({ ...createForm, active: v })} /><Label className="text-xs">Aktif</Label></div>
        <Button onClick={handleCreateUser} className="w-full">Ekle</Button>
      </div></DialogContent></Dialog>
    </div>
  );
}