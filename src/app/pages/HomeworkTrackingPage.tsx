import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ListChecks,
  XCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useStudentData } from "@/hooks/useStudentData";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function HomeworkTrackingPage() {
  const data = useStudentData();
  const { currentUser, teacherLessons, refreshTeacherLessons } = useAuth();
  const isTeacher =
    currentUser?.role === "teacher" ||
    currentUser?.role === "authorized_teacher";

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [assignmentFilterType, setAssignmentFilterType] = useState<
    "all" | "lesson" | "group"
  >("all");
  const [selectedLessonFilter, setSelectedLessonFilter] =
    useState<string>("all");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");

  useEffect(() => {
    data.loadHomeworkTemplates();
    data.loadHomeworkAssignments();
    data.loadStudents();
    data.loadLessons();
    data.loadClassRooms();
    refreshTeacherLessons();
  }, []);

  const myLessonIds = useMemo(() => {
    if (!isTeacher || !currentUser) return [];
    return teacherLessons
      .filter((t) => t.teacherId === currentUser.id)
      .map((t) => t.lessonId);
  }, [isTeacher, currentUser, teacherLessons]);

  const myGroupIds = useMemo(() => {
    if (!isTeacher || !currentUser) return [];
    return data.classRooms
      .filter((r) => r.teacherIds.includes(currentUser.id))
      .map((r) => r.id);
  }, [isTeacher, currentUser, data.classRooms]);

  const visibleStudents = useMemo(() => {
    if (!isTeacher || !currentUser) return data.students;

    const lessonStudents =
      myLessonIds.length > 0
        ? data.students.filter((s) =>
            s.lessons.some((lid: number) => myLessonIds.includes(lid)),
          )
        : [];
    const groupStudents =
      myGroupIds.length > 0
        ? data.students.filter((s) => myGroupIds.includes(s.groupId || -1))
        : [];

    const merged = [...lessonStudents, ...groupStudents];
    return merged.filter(
      (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i,
    );
  }, [isTeacher, currentUser, data.students, myLessonIds, myGroupIds]);

  const myLessons = useMemo(
    () => data.lessons.filter((l) => myLessonIds.includes(l.id)),
    [data.lessons, myLessonIds],
  );

  const myGroups = useMemo(
    () => data.classRooms.filter((g) => myGroupIds.includes(g.id)),
    [data.classRooms, myGroupIds],
  );

  const assignmentScopedStudents = useMemo(() => {
    if (!isTeacher) return visibleStudents;

    if (assignmentFilterType === "lesson") {
      if (selectedLessonFilter === "all") {
        return visibleStudents.filter((s) =>
          s.lessons.some((lid: number) => myLessonIds.includes(lid)),
        );
      }
      const lessonId = Number(selectedLessonFilter);
      return visibleStudents.filter((s) => s.lessons.includes(lessonId));
    }

    if (assignmentFilterType === "group") {
      if (selectedGroupFilter === "all") {
        return visibleStudents.filter((s) =>
          myGroupIds.includes(s.groupId || -1),
        );
      }
      const groupId = Number(selectedGroupFilter);
      return visibleStudents.filter((s) => s.groupId === groupId);
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

  const selectedTemplate = useMemo(
    () =>
      data.homeworkTemplates.find(
        (t) => String(t.id) === selectedTemplateId,
      ),
    [data.homeworkTemplates, selectedTemplateId],
  );

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assignmentScopedStudents;
    return assignmentScopedStudents.filter((s) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q),
    );
  }, [assignmentScopedStudents, search]);

  const studentAssignments = useMemo(() => {
    const map: Record<number, (typeof data.homeworkAssignments)[number][]> = {};
    data.homeworkAssignments.forEach((a) => {
      if (!map[a.studentId]) map[a.studentId] = [];
      map[a.studentId].push(a);
    });
    return map;
  }, [data.homeworkAssignments]);

  const getAssignment = (studentId: number) => {
    if (!selectedTemplateId) return undefined;
    return studentAssignments[studentId]?.find(
      (a) => String(a.templateId) === selectedTemplateId,
    );
  };

  const handleAssign = (studentId: number) => {
    if (!selectedTemplate) return;
    data.addHomeworkAssignment({
      studentId,
      templateId: selectedTemplate.id,
      title: selectedTemplate.title,
      content: selectedTemplate.content,
      details: selectedTemplate.details,
      author: currentUser?.fullName || currentUser?.username || "Öğretmen",
      completed: false,
      type: selectedTemplate.type || "diger",
    });
  };

  const handleUnassign = (assignmentId: number) => {
    data.deleteHomeworkAssignment(assignmentId);
  };

  const handleToggle = (assignmentId: number) => {
    data.toggleHomeworkCompleted(assignmentId);
  };

  const assignedCount = filteredStudents.filter((s) =>
    getAssignment(s.id),
  ).length;
  const completedCount = filteredStudents.filter((s) => {
    const a = getAssignment(s.id);
    return a?.completed;
  }).length;

  const activeTemplates = useMemo(
    () => data.homeworkTemplates.filter((t) => t.active ?? true),
    [data.homeworkTemplates],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Ödev Takip
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Takip Edilecek Ödev</CardTitle>
          <CardDescription>
            Öğretmen seçilen ödev tanımı üzerinden öğrenci durumlarını
            takip eder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isTeacher && (myLessonIds.length > 0 || myGroupIds.length > 0) && (
            <div className="space-y-2 rounded-md border bg-gray-50 p-3">
              <Label className="text-xs">Atama Filtresi</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    assignmentFilterType === "all" ? "default" : "outline"
                  }
                  onClick={() => setAssignmentFilterType("all")}
                >
                  Tümü
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    assignmentFilterType === "lesson" ? "default" : "outline"
                  }
                  onClick={() => setAssignmentFilterType("lesson")}
                >
                  Ders
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    assignmentFilterType === "group" ? "default" : "outline"
                  }
                  onClick={() => setAssignmentFilterType("group")}
                >
                  Grup
                </Button>
              </div>

              {assignmentFilterType === "lesson" && (
                <div className="space-y-1">
                  <Label className="text-xs">Ders Seç</Label>
                  <Select
                    value={selectedLessonFilter}
                    onValueChange={setSelectedLessonFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ders seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Dersler</SelectItem>
                      {myLessons.map((lesson) => (
                        <SelectItem key={lesson.id} value={String(lesson.id)}>
                          {lesson.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {assignmentFilterType === "group" && (
                <div className="space-y-1">
                  <Label className="text-xs">Grup Seç</Label>
                  <Select
                    value={selectedGroupFilter}
                    onValueChange={setSelectedGroupFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Grup seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Gruplar</SelectItem>
                      {myGroups.map((group) => (
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
              <Label className="text-xs">Ödev Tanımı</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ödev seçin" />
                </SelectTrigger>
                <SelectContent>
                  {activeTemplates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Öğrenci Ara</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ad veya soyad"
                disabled={!selectedTemplateId}
              />
            </div>
          </div>

          {selectedTemplate && (
            <div className="rounded-md border bg-gray-50 p-3 text-sm text-gray-700">
              <p className="font-medium">{selectedTemplate.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600">
                {selectedTemplate.content}
              </p>
              {selectedTemplate.details && (
                <p className="mt-1 text-xs text-gray-500">
                  Detay: {selectedTemplate.details}
                </p>
              )}
            </div>
          )}

          {!selectedTemplateId && (
            <div className="rounded-md border border-dashed p-8 text-center text-gray-500">
              <ListChecks size={40} className="mx-auto mb-3 opacity-50" />
              Ödev takip ekranını kullanmak için bir ödev tanımı seçin.
            </div>
          )}

          {isTeacher && myLessonIds.length === 0 && myGroupIds.length === 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              Size atanmış ders veya grup bulunmuyor. Bu ekranda öğrenci
              görebilmek için yönetici ataması gerekir.
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTemplateId && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                  <p className="text-xs text-blue-700">Atanan</p>
                  <p className="text-xl font-semibold text-blue-700">
                    {assignedCount}
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 border border-green-200">
                  <p className="text-xs text-green-700">Tamamlayan</p>
                  <p className="text-xl font-semibold text-green-700">
                    {completedCount}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
                  <p className="text-xs text-amber-700">Bekleyen</p>
                  <p className="text-xl font-semibold text-amber-700">
                    {assignedCount - completedCount}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 border border-gray-200">
                  <p className="text-xs text-gray-700">Atanmayan</p>
                  <p className="text-xl font-semibold text-gray-700">
                    {filteredStudents.length - assignedCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Öğrenci Listesi</CardTitle>
              <CardDescription>
                Her öğrenci için ödev ataması yapabilir, tamamlanma durumunu
                güncelleyebilirsiniz.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Öğrenci</TableHead>
                    <TableHead className="text-xs">Durum</TableHead>
                    <TableHead className="text-xs text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const assignment = getAssignment(student.id);
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium text-sm">
                          {student.firstName} {student.lastName}
                        </TableCell>
                        <TableCell>
                          {assignment ? (
                            <div className="flex items-center gap-2">
                              <Badge
                                className={`text-[10px] text-white ${assignment.completed ? "bg-green-500" : "bg-amber-500"}`}
                              >
                                {assignment.completed
                                  ? "Tamamlandı"
                                  : "Bekliyor"}
                              </Badge>
                              {assignment.completedAt && (
                                <span className="text-[10px] text-gray-400">
                                  {new Date(
                                    assignment.completedAt,
                                  ).toLocaleDateString("tr-TR")}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Atanmadı
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {assignment ? (
                              <>
                                <Button
                                  size="sm"
                                  variant={
                                    assignment.completed ? "outline" : "default"
                                  }
                                  onClick={() => handleToggle(assignment.id)}
                                >
                                  {assignment.completed ? (
                                    <>
                                      <XCircle size={13} className="mr-1" />
                                      Geri Al
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 size={13} className="mr-1" />
                                      Tamamlandı
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300"
                                  onClick={() => handleUnassign(assignment.id)}
                                >
                                  <Trash2 size={13} className="mr-1" />
                                  Kaldır
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAssign(student.id)}
                              >
                                <Plus size={13} className="mr-1" />
                                Ata
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center py-8 text-gray-500"
                      >
                        Öğrenci bulunamadı
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Badge variant="outline" className="w-fit">
            {filteredStudents.length} öğrenci listelendi
          </Badge>
        </>
      )}
    </div>
  );
}
