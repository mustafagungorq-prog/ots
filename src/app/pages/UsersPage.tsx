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

// ====== USERS PAGE ======
export function UsersPage() {
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