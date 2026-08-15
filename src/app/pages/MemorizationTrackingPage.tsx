import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ListChecks,
  XCircle,
  BookOpen,
  Type,
  Plus,
  Pencil,
  Trash2,
  Save,
  Clock,
  Home,
} from "lucide-react";
import { useStudentData } from "@/hooks/useStudentData";
import { useAuth } from "@/hooks/useAuth";
import { apiGet } from "@/hooks/useApi";
import { PERMISSIONS } from "@/types";
import type { MemorizationStatus, MemorizationMode } from "@/types";
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
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

type LocalStatus = {
  status: MemorizationStatus;
  scores?: Record<string, number>;
  teacherNote: string;
};

const STATUS_OPTIONS: MemorizationStatus[] = [
  "passed",
  "failed",
  "repeat_tecvid",
  "repeat_harf",
  "not_appointment",
  "home_work",
];

const STATUS_LABELS: Record<MemorizationStatus, string> = {
  passed: "Geçti",
  failed: "Kaldı",
  repeat_tecvid: "Tekrarlamalı (Tecvid)",
  repeat_harf: "Tekrarlamalı (Harf)",
  not_appointment: "Atanmadı",
  home_work: "Ev Ödevi",
};

const STATUS_BADGES: Record<MemorizationStatus, string> = {
  passed: "bg-green-500",
  failed: "bg-red-500",
  repeat_tecvid: "bg-amber-500",
  repeat_harf: "bg-blue-500",
  not_appointment: "bg-gray-500",
  home_work: "bg-purple-500",
};

export function MemorizationTrackingPage() {
  const data = useStudentData();
  const { hasPermission, currentUser } = useAuth();
  const canManageTexts = hasPermission(PERMISSIONS.MEMORIZATION_TEXT_MANAGE);
  const isTeacher =
    currentUser?.role === "teacher" ||
    currentUser?.role === "authorized_teacher";

  const [selectedTextId, setSelectedTextId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [textSearch, setTextSearch] = useState("");
  const [localStatuses, setLocalStatuses] = useState<
    Record<number, LocalStatus>
  >({});
  const [assignmentFilterType, setAssignmentFilterType] = useState<
    "all" | "lesson" | "group"
  >("all");
  const [selectedLessonFilter, setSelectedLessonFilter] =
    useState<string>("all");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTextId, setEditingTextId] = useState<number | null>(null);
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [memorizationMode, setMemorizationMode] = useState<MemorizationMode>("simple");

  const myLessonIds = useMemo(() => {
    if (!isTeacher || !currentUser) return [];
    return data.lessons.map((l) => l.id);
  }, [isTeacher, currentUser, data.lessons]);

  const myGroupIds = useMemo(() => {
    if (!isTeacher || !currentUser) return [];
    return data.classRooms
      .filter((r) => r.teacherIds.includes(currentUser.id))
      .map((r) => r.id);
  }, [isTeacher, currentUser, data.classRooms]);

  const visibleStudents = useMemo(() => {
    return data.students;
  }, [data.students]);

  const myLessons = useMemo(
    () => data.lessons.filter((l) => myLessonIds.includes(l.id)),
    [data.lessons, myLessonIds],
  );

  const myGroups = useMemo(
    () => data.classRooms.filter((g) => myGroupIds.includes(g.id)),
    [data.classRooms, myGroupIds],
  );

  const activeCriteria = useMemo(
    () => data.memorizationCriteria.filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [data.memorizationCriteria],
  );

  const availableGroupsForSelectedLesson = useMemo(() => {
    if (selectedLessonFilter === "all") return myGroups;
    const lessonId = Number(selectedLessonFilter);
    return myGroups.filter((g) => g.lessonIds?.includes(lessonId));
  }, [selectedLessonFilter, myGroups]);

  const assignmentScopedStudents = useMemo(() => {
    if (!isTeacher) return visibleStudents;

    let result = visibleStudents;

    if (assignmentFilterType === "lesson" || assignmentFilterType === "group") {
      if (selectedLessonFilter !== "all") {
        const lessonId = Number(selectedLessonFilter);
        result = result.filter((s) => s.lessons.includes(lessonId));
      } else if (assignmentFilterType === "lesson" && myLessonIds.length > 0) {
        result = result.filter((s) =>
          s.lessons.some((lid) => myLessonIds.includes(lid)),
        );
      }

      if (selectedGroupFilter !== "all") {
        const groupId = Number(selectedGroupFilter);
        result = result.filter((s) => s.groupId === groupId);
      } else if (assignmentFilterType === "group" && myGroupIds.length > 0) {
        result = result.filter((s) => myGroupIds.includes(s.groupId || -1));
      }

      return result;
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
    () => data.memorizationTexts.find((t) => String(t.id) === selectedTextId),
    [data.memorizationTexts, selectedTextId],
  );

  const filteredMemorizationTexts = useMemo(() => {
    const q = textSearch.trim().toLowerCase();
    if (!q) return data.memorizationTexts;
    return data.memorizationTexts.filter((t) =>
      t.title.toLowerCase().includes(q),
    );
  }, [data.memorizationTexts, textSearch]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assignmentScopedStudents;
    return assignmentScopedStudents.filter((s) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q),
    );
  }, [assignmentScopedStudents, search]);

  useEffect(() => {
    setSelectedGroupFilter("all");
  }, [selectedLessonFilter]);

  useEffect(() => {
    if (!selectedTextId) {
      setLocalStatuses({});
      return;
    }

    const textId = Number(selectedTextId);
    const map: Record<number, LocalStatus> = {};
    data.memorizationTracking
      .filter((r) => r.textId === textId)
      .forEach((r) => {
        map[r.studentId] = {
          status: r.status,
          scores: r.scores ? { ...r.scores } : undefined,
          teacherNote: r.teacherNote || "",
        };
      });

    setLocalStatuses(map);
  }, [selectedTextId, data.memorizationTracking]);

  useEffect(() => {
    data.loadMemorizationTexts();
    data.loadMemorizationTracking();
    data.loadMemorizationCriteria();
    data.loadStudents();
    data.loadLessons();
    data.loadClassRooms();
    apiGet<{ value?: string }>("system-settings/memorization_mode")
      .then((d) => {
        const mode = d.value as MemorizationMode;
        setMemorizationMode(["simple", "scoring", "detailed"].includes(mode) ? mode : "simple");
      })
      .catch(() => setMemorizationMode("simple"));
  }, []);
  /*
  if (
    data.loadingMemorizationTexts ||
    data.loadingMemorizationTracking ||
    data.loadingStudents ||
    data.loadingLessons ||
    data.loadingClassRooms
  ) {
    return <Loading />;
  }*/

  const passedCount = Object.values(localStatuses).filter(
    (x) => x.status === "passed",
  ).length;
  const failedCount = Object.values(localStatuses).filter(
    (x) => x.status === "failed",
  ).length;
  const repeatTecvidCount = Object.values(localStatuses).filter(
    (x) => x.status === "repeat_tecvid",
  ).length;
  const repeatHarfCount = Object.values(localStatuses).filter(
    (x) => x.status === "repeat_harf",
  ).length;

  const openCreateDialog = () => {
    setEditingTextId(null);
    setTextTitle("");
    setTextContent("");
    setDialogOpen(true);
  };

  const openEditDialog = (id: number) => {
    const text = data.memorizationTexts.find((t) => t.id === id);
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

  const computeStatusFromScores = (
    scores: Record<string, number> | undefined,
  ): MemorizationStatus => {
    if (!scores || activeCriteria.length === 0) return "failed";
    let weightedSum = 0;
    let totalWeight = 0;
    activeCriteria.forEach((c) => {
      const score = scores[c.code] ?? 0;
      weightedSum += score * c.weight;
      totalWeight += c.weight;
    });
    if (totalWeight === 0) return "failed";
    const avg = weightedSum / totalWeight;
    if (avg >= 70) return "passed";
    if (avg >= 50) return "repeat_tecvid";
    return "failed";
  };

  const updateLocalStatus = (studentId: number, status: MemorizationStatus) => {
    setLocalStatuses((prev) => ({
      ...prev,
      [studentId]: {
        status,
        scores: prev[studentId]?.scores,
        teacherNote: prev[studentId]?.teacherNote || "",
      },
    }));
  };

  const updateLocalScore = (
    studentId: number,
    code: string,
    value: number,
  ) => {
    setLocalStatuses((prev) => {
      const nextScores = { ...(prev[studentId]?.scores || {}) };
      nextScores[code] = value;
      const autoStatus = computeStatusFromScores(nextScores);
      return {
        ...prev,
        [studentId]: {
          status: autoStatus,
          scores: nextScores,
          teacherNote: prev[studentId]?.teacherNote || "",
        },
      };
    });
  };

  const updateLocalNote = (studentId: number, teacherNote: string) => {
    setLocalStatuses((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || "not_appointment",
        scores: prev[studentId]?.scores,
        teacherNote,
      },
    }));
  };

  const saveStudentStatus = (studentId: number) => {
    if (!selectedTextId) return;
    const row = localStatuses[studentId] || {
      status: "not_appointment" as MemorizationStatus,
      teacherNote: "",
    };
    data.setMemorizationStatus(
      studentId,
      Number(selectedTextId),
      row.status,
      row.teacherNote,
      row.scores,
    );
  };

  const saveAllStatuses = () => {
    if (!selectedTextId) return;
    filteredStudents.forEach((student) => {
      const row = localStatuses[student.id] || {
        status: "not_appointment" as MemorizationStatus,
        teacherNote: "",
      };
      data.setMemorizationStatus(
        student.id,
        Number(selectedTextId),
        row.status,
        row.teacherNote,
        row.scores,
      );
    });
  };

  const saveSelectedStatuses = () => {
    if (!selectedTextId) return;
    filteredStudents
      .filter((student) => selectedStudentIds.includes(student.id))
      .forEach((student) => {
        const row = localStatuses[student.id] || {
          status: "not_appointment" as MemorizationStatus,
          teacherNote: "",
        };
        data.setMemorizationStatus(
          student.id,
          Number(selectedTextId),
          row.status,
          row.teacherNote,
          row.scores,
        );
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Ezber Takip
        </h2>
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
          <CardDescription>
            Öğretmen kontrolleri seçilen ezber metni üzerinden yapılır.
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
                <div className="space-y-2">
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
                        {availableGroupsForSelectedLesson.map((group) => (
                          <SelectItem key={group.id} value={String(group.id)}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Ezber Metni</Label>
                <Select value={selectedTextId} onValueChange={setSelectedTextId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Metin seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredMemorizationTexts.map((text) => (
                      <SelectItem key={text.id} value={String(text.id)}>
                        {text.title}
                      </SelectItem>
                    ))}
                    {filteredMemorizationTexts.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-gray-500">
                        Sonuç bulunamadı
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Metin Ara</Label>
                <Input
                  value={textSearch}
                  onChange={(e) => setTextSearch(e.target.value)}
                  placeholder="Ezber metni başlığı ara"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Öğrenci Ara</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ad veya soyad"
                disabled={!selectedTextId}
              />
            </div>
          </div>

          {selectedText && (
            <div className="rounded-md border bg-gray-50 p-3 text-sm text-gray-700">
              <p className="font-medium">{selectedText.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600">
                {selectedText.content}
              </p>
              {canManageTexts && (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(selectedText.id)}
                  >
                    <Pencil size={14} className="mr-1" />
                    Düzenle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300"
                    onClick={() => {
                      if (
                        confirm(
                          "Metin silinsin mi? Bu metne ait takip kayıtları da silinecektir.",
                        )
                      ) {
                        data.deleteMemorizationText(selectedText.id);
                        setSelectedTextId("");
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
              Size atanmış ders veya grup bulunmuyor. Bu ekranda öğrenci
              görebilmek için yönetici ataması gerekir.
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTextId && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-lg bg-green-50 p-3 border border-green-200">
                  <p className="text-xs text-green-700">Geçti</p>
                  <p className="text-xl font-semibold text-green-700">
                    {passedCount}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
                  <p className="text-xs text-amber-700">Tekrarlamalı (Tecvid)</p>
                  <p className="text-xl font-semibold text-amber-700">
                    {repeatTecvidCount}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                  <p className="text-xs text-blue-700">Tekrarlamalı (Harf)</p>
                  <p className="text-xl font-semibold text-blue-700">
                    {repeatHarfCount}
                  </p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 border border-red-200">
                  <p className="text-xs text-red-700">Kaldı</p>
                  <p className="text-xl font-semibold text-red-700">
                    {failedCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Öğrenci Listesi</CardTitle>
              <CardDescription>
                Öğretmen her öğrenci için durumu seçip tek tek ya da toplu
                kaydedebilir.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={
                            filteredStudents.length > 0 &&
                            filteredStudents.every((s) =>
                              selectedStudentIds.includes(s.id),
                            )
                          }
                          onCheckedChange={(checked) => {
                            setSelectedStudentIds((prev) =>
                              checked
                                ? Array.from(
                                    new Set([
                                      ...prev,
                                      ...filteredStudents.map((s) => s.id),
                                    ]),
                                  )
                                : prev.filter(
                                    (id) =>
                                      !filteredStudents.some((s) => s.id === id),
                                  ),
                            );
                          }}
                          aria-label="Tümünü seç"
                        />
                        Öğrenci
                      </div>
                    </TableHead>
                    {memorizationMode === "simple" ? (
                      <TableHead className="text-xs">Durum</TableHead>
                    ) : (
                      <>
                        <TableHead className="text-xs">Kriterler</TableHead>
                        <TableHead className="text-xs">Durum</TableHead>
                      </>
                    )}
                    <TableHead className="text-xs">Öğretmen Notu</TableHead>
                    <TableHead className="text-xs text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const row = localStatuses[student.id] || {
                      status: "not_appointment" as MemorizationStatus,
                      teacherNote: "",
                    };
                    const isSelected = selectedStudentIds.includes(student.id);
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium text-sm">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                setSelectedStudentIds((prev) =>
                                  checked
                                    ? [...prev, student.id]
                                    : prev.filter((id) => id !== student.id),
                                );
                              }}
                              aria-label={`${student.firstName} ${student.lastName} seç`}
                            />
                            {student.firstName} {student.lastName}
                          </div>
                        </TableCell>
                        {memorizationMode === "simple" ? (
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {STATUS_OPTIONS.map((status) => (
                                <Button
                                  key={status}
                                  type="button"
                                  size="sm"
                                  variant={
                                    row.status === status ? "default" : "outline"
                                  }
                                  className={
                                    row.status === status
                                      ? `${STATUS_BADGES[status]} text-white`
                                      : ""
                                  }
                                  onClick={() =>
                                    updateLocalStatus(student.id, status)
                                  }
                                >
                                  {status === "passed" && (
                                    <CheckCircle2 size={13} className="mr-1" />
                                  )}
                                  {status === "failed" && (
                                    <XCircle size={13} className="mr-1" />
                                  )}
                                  {status === "repeat_tecvid" && (
                                    <BookOpen size={13} className="mr-1" />
                                  )}
                                  {status === "repeat_harf" && (
                                    <Type size={13} className="mr-1" />
                                  )}
                                  {status === "not_appointment" && (
                                    <Clock size={13} className="mr-1" />
                                  )}
                                  {status === "home_work" && (
                                    <Home size={13} className="mr-1" />
                                  )}
                                  {STATUS_LABELS[status]}
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        ) : (
                          <>
                            <TableCell>
                              <div className="flex flex-wrap gap-3 items-center">
                                {activeCriteria.map((c) => (
                                  <div
                                    key={c.code}
                                    className="flex items-center gap-1"
                                  >
                                    <Label className="text-[10px] whitespace-nowrap">
                                      {c.label}
                                    </Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={c.maxScore}
                                      value={row.scores?.[c.code] ?? ""}
                                      onChange={(e) =>
                                        updateLocalScore(
                                          student.id,
                                          c.code,
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-16 h-7 text-xs px-1"
                                    />
                                  </div>
                                ))}
                                {activeCriteria.length === 0 && (
                                  <span className="text-xs text-gray-400">
                                    Kriter tanımlanmamış
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`text-[10px] text-white ${STATUS_BADGES[row.status]}`}
                              >
                                {STATUS_LABELS[row.status]}
                              </Badge>
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          {memorizationMode === "detailed" ? (
                            <Textarea
                              value={row.teacherNote}
                              onChange={(e) =>
                                updateLocalNote(student.id, e.target.value)
                              }
                              placeholder="Ayrıntılı not"
                              rows={2}
                              className="min-w-[180px]"
                            />
                          ) : (
                            <Input
                              value={row.teacherNote}
                              onChange={(e) =>
                                updateLocalNote(student.id, e.target.value)
                              }
                              placeholder="Not"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => saveStudentStatus(student.id)}
                          >
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
            <Badge variant="outline" className="w-fit">
              {filteredStudents.length} öğrenci listelendi
              {selectedStudentIds.length > 0 &&
                ` · ${selectedStudentIds.length} seçili`}
            </Badge>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={selectedStudentIds.length === 0}
                onClick={saveSelectedStatuses}
              >
                <Save size={16} className="mr-1" />
                Seçilileri Kaydet
              </Button>
              <Button onClick={saveAllStatuses}>
                <Save size={16} className="mr-1" />
                Tümünü Kaydet
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTextId ? "Ezber Metni Düzenle" : "Yeni Ezber Metni"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Başlık</Label>
              <Input
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                placeholder="Örn: Yasin Suresi ilk 10 ayet"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Metin</Label>
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={6}
                placeholder="Ezberlenecek metni girin"
              />
            </div>
            <Button onClick={saveText} className="w-full">
              {editingTextId ? "Güncelle" : "Ekle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
