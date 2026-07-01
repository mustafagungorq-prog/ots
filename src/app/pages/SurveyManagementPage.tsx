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

// ====== SURVEY MANAGEMENT PAGE ======
export function SurveyManagementPage() {
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