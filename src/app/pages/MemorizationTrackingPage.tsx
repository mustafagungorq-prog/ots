import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ListChecks, RotateCcw, XCircle, Plus, Pencil, Trash2, Save } from 'lucide-react';
import { useStudentData } from '@/hooks/useStudentData';
import { useAuth } from '@/hooks/useAuth';
import { PERMISSIONS } from '@/types';
import type { MemorizationStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type LocalStatus = {
  status: MemorizationStatus;
  teacherNote: string;
};

const STATUS_OPTIONS: MemorizationStatus[] = ['completed', 'repeat', 'not_completed'];

const STATUS_LABELS: Record<MemorizationStatus, string> = {
  completed: 'Tamamladı',
  repeat: 'Tekrarlanacak',
  not_completed: 'Tamamlanmadı',
};

const STATUS_BADGES: Record<MemorizationStatus, string> = {
  completed: 'bg-green-500',
  repeat: 'bg-amber-500',
  not_completed: 'bg-red-500',
};

export function MemorizationTrackingPage() {
  const data = useStudentData();
  const { hasPermission, currentUser, teacherLessons } = useAuth();
  const canManageTexts = hasPermission(PERMISSIONS.MEMORIZATION_TEXT_MANAGE);
  const isTeacher = currentUser?.role === 'teacher' || currentUser?.role === 'authorized_teacher';

  const [selectedTextId, setSelectedTextId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [localStatuses, setLocalStatuses] = useState<Record<number, LocalStatus>>({});
  const [assignmentFilterType, setAssignmentFilterType] = useState<'all' | 'lesson' | 'group'>('all');
  const [selectedLessonFilter, setSelectedLessonFilter] = useState<string>('all');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTextId, setEditingTextId] = useState<number | null>(null);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');

  const myLessonIds = useMemo(() => {
    if (!isTeacher || !currentUser) return [];
    return teacherLessons.filter(t => t.teacherId === currentUser.id).map(t => t.lessonId);
  }, [isTeacher, currentUser, teacherLessons]);

  const myGroupIds = useMemo(() => {
    if (!isTeacher || !currentUser) return [];
    return data.classRooms.filter(r => r.teacherIds.includes(currentUser.id)).map(r => r.id);
  }, [isTeacher, currentUser, data.classRooms]);

  const visibleStudents = useMemo(() => {
    if (!isTeacher || !currentUser) return data.students;

    const lessonStudents = myLessonIds.length > 0
      ? data.students.filter(s => s.lessons.some(lid => myLessonIds.includes(lid)))
      : [];
    const groupStudents = myGroupIds.length > 0
      ? data.students.filter(s => myGroupIds.includes(s.groupId || -1))
      : [];

    const merged = [...lessonStudents, ...groupStudents];
    return merged.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
  }, [isTeacher, currentUser, data.students, myLessonIds, myGroupIds]);

  const myLessons = useMemo(
    () => data.lessons.filter(l => myLessonIds.includes(l.id)),
    [data.lessons, myLessonIds],
  );

  const myGroups = useMemo(
    () => data.classRooms.filter(g => myGroupIds.includes(g.id)),
    [data.classRooms, myGroupIds],
  );

  const assignmentScopedStudents = useMemo(() => {
    if (!isTeacher) return visibleStudents;

    if (assignmentFilterType === 'lesson') {
      if (selectedLessonFilter === 'all') {
        return visibleStudents.filter(s => s.lessons.some(lid => myLessonIds.includes(lid)));
      }
      const lessonId = Number(selectedLessonFilter);
      return visibleStudents.filter(s => s.lessons.includes(lessonId));
    }

    if (assignmentFilterType === 'group') {
      if (selectedGroupFilter === 'all') {
        return visibleStudents.filter(s => myGroupIds.includes(s.groupId || -1));
      }
      const groupId = Number(selectedGroupFilter);
      return visibleStudents.filter(s => s.groupId === groupId);
    }

    return visibleStudents;
  }, [
    isTeacher,
    visibleStudents,
    assignmentFilterType,
    selectedLessonFilter,
    selectedGroupFilter,
    myLessonIds,
    myGroupIds,
  ]);

  const selectedText = useMemo(
    () => data.memorizationTexts.find(t => String(t.id) === selectedTextId),
    [data.memorizationTexts, selectedTextId],
  );

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assignmentScopedStudents;
    return assignmentScopedStudents.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q));
  }, [assignmentScopedStudents, search]);

  useEffect(() => {
    if (!selectedTextId) {
      setLocalStatuses({});
      return;
    }

    const textId = Number(selectedTextId);
    const map: Record<number, LocalStatus> = {};
    data.memorizationTracking
      .filter(r => r.textId === textId)
      .forEach(r => {
        map[r.studentId] = {
          status: r.status,
          teacherNote: r.teacherNote || '',
        };
      });

    setLocalStatuses(map);
  }, [selectedTextId, data.memorizationTracking]);

  const completedCount = Object.values(localStatuses).filter(x => x.status === 'completed').length;
  const repeatCount = Object.values(localStatuses).filter(x => x.status === 'repeat').length;
  const notCompletedCount = filteredStudents.length - completedCount - repeatCount;

  const openCreateDialog = () => {
    setEditingTextId(null);
    setTextTitle('');
    setTextContent('');
    setDialogOpen(true);
  };

  const openEditDialog = (id: number) => {
    const text = data.memorizationTexts.find(t => t.id === id);
    if (!text) return;
    setEditingTextId(id);
    setTextTitle(text.title);
    setTextContent(text.content);
    setDialogOpen(true);
  };

  const saveText = () => {
    const title = textTitle.trim();
    const content = textContent.trim();
    if (!title || !content) return;

    if (editingTextId) {
      data.updateMemorizationText(editingTextId, { title, content });
    } else {
      data.addMemorizationText({ title, content, active: true });
    }

    setDialogOpen(false);
  };

  const updateLocalStatus = (studentId: number, status: MemorizationStatus) => {
    setLocalStatuses(prev => ({
      ...prev,
      [studentId]: {
        status,
        teacherNote: prev[studentId]?.teacherNote || '',
      },
    }));
  };

  const updateLocalNote = (studentId: number, teacherNote: string) => {
    setLocalStatuses(prev => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'not_completed',
        teacherNote,
      },
    }));
  };

  const saveStudentStatus = (studentId: number) => {
    if (!selectedTextId) return;
    const row = localStatuses[studentId] || { status: 'not_completed' as MemorizationStatus, teacherNote: '' };
    data.setMemorizationStatus(studentId, Number(selectedTextId), row.status, row.teacherNote);
  };

  const saveAllStatuses = () => {
    if (!selectedTextId) return;
    filteredStudents.forEach(student => {
      const row = localStatuses[student.id] || { status: 'not_completed' as MemorizationStatus, teacherNote: '' };
      data.setMemorizationStatus(student.id, Number(selectedTextId), row.status, row.teacherNote);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Ezber Takip</h2>
        {canManageTexts && (
          <Button onClick={openCreateDialog}>
            <Plus size={16} className="mr-1" />
            Ezber Metni Ekle
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Takip Metni Seçimi</CardTitle>
          <CardDescription>Öğretmen kontrolleri seçilen ezber metni üzerinden yapılır.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isTeacher && (myLessonIds.length > 0 || myGroupIds.length > 0) && (
            <div className="space-y-2 rounded-md border bg-gray-50 p-3">
              <Label className="text-xs">Atama Filtresi</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={assignmentFilterType === 'all' ? 'default' : 'outline'}
                  onClick={() => setAssignmentFilterType('all')}
                >
                  Tümü
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={assignmentFilterType === 'lesson' ? 'default' : 'outline'}
                  onClick={() => setAssignmentFilterType('lesson')}
                >
                  Ders
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={assignmentFilterType === 'group' ? 'default' : 'outline'}
                  onClick={() => setAssignmentFilterType('group')}
                >
                  Grup
                </Button>
              </div>

              {assignmentFilterType === 'lesson' && (
                <div className="space-y-1">
                  <Label className="text-xs">Ders Seç</Label>
                  <Select value={selectedLessonFilter} onValueChange={setSelectedLessonFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ders seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Dersler</SelectItem>
                      {myLessons.map(lesson => (
                        <SelectItem key={lesson.id} value={String(lesson.id)}>
                          {lesson.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {assignmentFilterType === 'group' && (
                <div className="space-y-1">
                  <Label className="text-xs">Grup Seç</Label>
                  <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Grup seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Gruplar</SelectItem>
                      {myGroups.map(group => (
                        <SelectItem key={group.id} value={String(group.id)}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Ezber Metni</Label>
              <Select value={selectedTextId} onValueChange={setSelectedTextId}>
                <SelectTrigger>
                  <SelectValue placeholder="Metin seçin" />
                </SelectTrigger>
                <SelectContent>
                  {data.memorizationTexts.map(text => (
                    <SelectItem key={text.id} value={String(text.id)}>
                      {text.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Öğrenci Ara</Label>
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Ad veya soyad"
                disabled={!selectedTextId}
              />
            </div>
          </div>

          {selectedText && (
            <div className="rounded-md border bg-gray-50 p-3 text-sm text-gray-700">
              <p className="font-medium">{selectedText.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600">{selectedText.content}</p>
              {canManageTexts && (
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(selectedText.id)}>
                    <Pencil size={14} className="mr-1" />
                    Düzenle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300"
                    onClick={() => {
                      if (confirm('Metin silinsin mi? Bu metne ait takip kayıtları da silinecektir.')) {
                        data.deleteMemorizationText(selectedText.id);
                        setSelectedTextId('');
                      }
                    }}
                  >
                    <Trash2 size={14} className="mr-1" />
                    Sil
                  </Button>
                </div>
              )}
            </div>
          )}

          {!selectedTextId && (
            <div className="rounded-md border border-dashed p-8 text-center text-gray-500">
              <ListChecks size={40} className="mx-auto mb-3 opacity-50" />
              Ezber takip ekranını kullanmak için bir metin seçin.
            </div>
          )}

          {isTeacher && myLessonIds.length === 0 && myGroupIds.length === 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              Size atanmış ders veya grup bulunmuyor. Bu ekranda öğrenci görebilmek için yönetici ataması gerekir.
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTextId && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-green-50 p-3 border border-green-200">
                  <p className="text-xs text-green-700">Tamamladı</p>
                  <p className="text-xl font-semibold text-green-700">{completedCount}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
                  <p className="text-xs text-amber-700">Tekrarlanacak</p>
                  <p className="text-xl font-semibold text-amber-700">{repeatCount}</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 border border-red-200">
                  <p className="text-xs text-red-700">Tamamlanmadı</p>
                  <p className="text-xl font-semibold text-red-700">{notCompletedCount < 0 ? 0 : notCompletedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Öğrenci Listesi</CardTitle>
              <CardDescription>Öğretmen her öğrenci için durumu seçip tek tek ya da toplu kaydedebilir.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Öğrenci</TableHead>
                    <TableHead className="text-xs">Durum</TableHead>
                    <TableHead className="text-xs">Öğretmen Notu</TableHead>
                    <TableHead className="text-xs text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map(student => {
                    const row = localStatuses[student.id] || { status: 'not_completed' as MemorizationStatus, teacherNote: '' };
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium text-sm">{student.firstName} {student.lastName}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {STATUS_OPTIONS.map(status => (
                              <Button
                                key={status}
                                type="button"
                                size="sm"
                                variant={row.status === status ? 'default' : 'outline'}
                                className={row.status === status ? `${STATUS_BADGES[status]} text-white` : ''}
                                onClick={() => updateLocalStatus(student.id, status)}
                              >
                                {status === 'completed' && <CheckCircle2 size={13} className="mr-1" />}
                                {status === 'repeat' && <RotateCcw size={13} className="mr-1" />}
                                {status === 'not_completed' && <XCircle size={13} className="mr-1" />}
                                {STATUS_LABELS[status]}
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.teacherNote}
                            onChange={e => updateLocalNote(student.id, e.target.value)}
                            placeholder="Not"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => saveStudentStatus(student.id)}>
                            <Save size={14} className="mr-1" />
                            Kaydet
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Badge variant="outline" className="w-fit">{filteredStudents.length} öğrenci listelendi</Badge>
            <Button onClick={saveAllStatuses}>
              <Save size={16} className="mr-1" />
              Tümünü Kaydet
            </Button>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTextId ? 'Ezber Metni Düzenle' : 'Yeni Ezber Metni'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Başlık</Label>
              <Input value={textTitle} onChange={e => setTextTitle(e.target.value)} placeholder="Örn: Yasin Suresi ilk 10 ayet" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Metin</Label>
              <Textarea value={textContent} onChange={e => setTextContent(e.target.value)} rows={6} placeholder="Ezberlenecek metni girin" />
            </div>
            <Button onClick={saveText} className="w-full">
              {editingTextId ? 'Güncelle' : 'Ekle'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
