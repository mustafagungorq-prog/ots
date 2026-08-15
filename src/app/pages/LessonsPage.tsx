// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import {
  Navigate,
  useNavigate,
  useLocation,
  useParams,
  Link,
} from "react-router";
import {
  Users,
  BookOpen,
  ClipboardCheck,
  MessageSquare,
  LayoutDashboard,
  Search,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  TrendingUp,
  Send,
  FileText,
  Mail,
  Smartphone,
  BookOpenCheck,
  NotebookPen,
  GraduationCap,
  School as SchoolIcon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  UsersRound,
  Save,
  Shield,
  UserCog,
  LogOut,
  Eye,
  EyeOff,
  UserCheck,
  ArrowLeft,
  BarChart3,
  ChevronDown,
  BookMarked,
  ClipboardList,
  ListChecks,
  CheckSquare,
  AlignLeft,
  CircleDot,
  Clock,
  AlertTriangle,
  Printer,
  Info,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useStudentData } from "@/hooks/useStudentData";
import { useAuth } from "@/hooks/useAuth";
import type {
  Student,
  School,
  Course,
  CourseSchedule,
  Attendance,
  User,
  UserRole,
  Survey,
  SurveyQuestion,
  SurveyAnswer,
  QuestionType,
  HomeworkTemplate,
  ClassRoom,
} from "@/types";
import { PERMISSIONS } from "@/types";
import type { PermissionMatrixEntry } from "@/hooks/useAuth";
import { Loading } from "@/components/Loading";

export const DAYS = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];
export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  authorized_teacher: "Yetkili Öğr.",
  teacher: "Öğretmen",
  parent: "Veli",
};
export const ROLE_COLORS: Record<UserRole, string> = {
  superadmin: "bg-red-500",
  admin: "bg-blue-500",
  authorized_teacher: "bg-green-500",
  teacher: "bg-cyan-500",
  parent: "bg-orange-500",
};

// ====== UTILS ======
function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function getMonthName(key: string) {
  const [y, m] = key.split("-");
  const names = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];
  return `${names[Number(m) - 1]} ${y}`;
}

// ====== LESSONS PAGE (2 Grid) ======
export function LessonsPage() {
  const data = useStudentData();
  const { canViewColumn, users, usersLoaded, refreshUsers, currentUser } = useAuth();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CourseSchedule | null>(null);
  const [form, setForm] = useState<Partial<CourseSchedule>>({});
  const [selectedSchedule, setSelectedSchedule] = useState<number | null>(null);
  const [gradeFilter, setGradeFilter] = useState("");
  const [courseOpen, setCourseOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState<Partial<Course>>({});

  // Toplu kurs atama state'leri
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignCourseId, setAssignCourseId] = useState<string>("");
  const [assignSearch, setAssignSearch] = useState("");
  const [assignOnlyUnassigned, setAssignOnlyUnassigned] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  useEffect(() => {
    data.loadLessons();
    data.loadCourseSchedules();
    data.loadClassRooms();
    data.loadStudents();
    data.loadSchools();
    refreshUsers();
  }, []);

  /*
  if (data.loadingLessons || data.loadingStudents || data.loadingSchools || !usersLoaded) {
    return <Loading />;
  }*/

  const grades = useMemo(
    () => Array.from(new Set(data.students.map((s) => s.grade))).sort(),
    [data.students],
  );
  const handleSubmit = () => {
    if (
      !form.courseId ||
      !form.dayOfWeek ||
      !form.startTime ||
      !form.endTime
    )
      return;
    const payload = {
      ...form,
      courseId: Number(form.courseId),
      classRoomId: form.classRoomId ? Number(form.classRoomId) : null,
    };
    if (editing) data.updateCourseSchedule(editing.id, payload);
    else data.addCourseSchedule(payload as Omit<CourseSchedule, "id">);
    setOpen(false);
    setEditing(null);
    setForm({});
  };
  const handleCourseSubmit = () => {
    if (!courseForm.name) return;
    if (editingCourse) data.updateCourse(editingCourse.id, courseForm);
    else data.addCourse(courseForm as Omit<Course, "id">);
    setCourseOpen(false);
    setEditingCourse(null);
    setCourseForm({});
  };
  const studentsInLesson = useMemo(() => {
    if (!selectedSchedule) return [];
    const schedule = data.courseSchedules.find((s) => s.id === selectedSchedule);
    if (!schedule) return [];
    return data.students.filter(
      (s) =>
        s.lessons.includes(schedule.courseId) &&
        (!gradeFilter || s.grade === gradeFilter),
    );
  }, [selectedSchedule, gradeFilter, data.students, data.courseSchedules]);

  const assignStudents = useMemo(() => {
    const courseId = assignCourseId ? Number(assignCourseId) : null;
    return data.students
      .filter((s) => {
        const matchesSearch = `${s.firstName} ${s.lastName}`
          .toLowerCase()
          .includes(assignSearch.toLowerCase());
        if (!matchesSearch) return false;
        if (assignOnlyUnassigned && courseId && s.lessons.includes(courseId))
          return false;
        return true;
      })
      .sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`,
          "tr",
        ),
      );
  }, [data.students, assignSearch, assignOnlyUnassigned, assignCourseId]);

  const toggleStudentSelection = (sid: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid],
    );
  };

  const selectAllAssignStudents = () => {
    setSelectedStudentIds(assignStudents.map((s) => s.id));
  };

  const deselectAllAssignStudents = () => {
    setSelectedStudentIds([]);
  };

  const handleAssignCourse = () => {
    if (!assignCourseId || selectedStudentIds.length === 0) return;
    data.assignCourseToStudents(Number(assignCourseId), selectedStudentIds);
    setAssignOpen(false);
    setAssignCourseId("");
    setAssignSearch("");
    setSelectedStudentIds([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Ders Planları</h2>
        <div className="flex gap-2">
          {currentUser?.role === "superadmin" && (
            <Button
              variant="outline"
              onClick={() => {
                setEditingCourse(null);
                setCourseForm({});
                setCourseOpen(true);
              }}
            >
              <BookMarked size={18} className="mr-1" /> Kurs Yönetimi
            </Button>
          )}
          <Button
            onClick={() => {
              setEditing(null);
              setForm({});
              setOpen(true);
            }}
          >
            <Plus size={18} className="mr-1" /> Ders Planı Ekle
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setAssignCourseId("");
              setAssignSearch("");
              setSelectedStudentIds([]);
              setAssignOpen(true);
            }}
          >
            <Users size={18} className="mr-1" /> Öğrencilere Kurs Ata
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ders Planı Listesi (tıklayın)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {canViewColumn("lessons", "name") && (
                  <TableHead className="text-xs">Kurs</TableHead>
                )}
                {canViewColumn("lessons", "classRoom") && (
                  <TableHead className="text-xs">Sınıf</TableHead>
                )}
                {canViewColumn("lessons", "dayOfWeek") && (
                  <TableHead className="text-xs">Gün</TableHead>
                )}
                {canViewColumn("lessons", "time") && (
                  <TableHead className="text-xs">Saat</TableHead>
                )}
                {canViewColumn("lessons", "studentCount") && (
                  <TableHead className="text-xs">Öğrenci</TableHead>
                )}
                {canViewColumn("lessons", "actions") && (
                  <TableHead className="text-xs">İşlem</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.courseSchedules.map((s) => {
                const c = data.students.filter((st) =>
                  st.lessons.includes(s.courseId),
                ).length;
                const classRoom = data.classRooms.find((r) => r.id === s.classRoomId);
                const sel = selectedSchedule === s.id;
                return (
                  <TableRow
                    key={s.id}
                    onClick={() => setSelectedSchedule(sel ? null : s.id)}
                    className={`cursor-pointer transition-colors ${sel ? "bg-emerald-50 border-l-4 border-l-emerald-500" : "hover:bg-gray-50"}`}
                  >
                    {canViewColumn("lessons", "name") && (
                      <TableCell className="font-medium text-sm">
                        {s.name}
                      </TableCell>
                    )}
                    {canViewColumn("lessons", "classRoom") && (
                      <TableCell className="text-sm">{classRoom?.name || "-"}</TableCell>
                    )}
                    {canViewColumn("lessons", "dayOfWeek") && (
                      <TableCell className="text-sm">{s.dayOfWeek}</TableCell>
                    )}
                    {canViewColumn("lessons", "time") && (
                      <TableCell className="text-xs">
                        {s.startTime}-{s.endTime}
                      </TableCell>
                    )}
                    {canViewColumn("lessons", "studentCount") && (
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {c} öğr.
                        </Badge>
                      </TableCell>
                    )}
                    {canViewColumn("lessons", "actions") && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(s);
                              setForm(s);
                              setOpen(true);
                            }}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Ders planı silinsin mi?")) {
                                data.deleteCourseSchedule(s.id);
                                if (selectedSchedule === s.id)
                                  setSelectedSchedule(null);
                              }
                            }}
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {selectedSchedule && (
        <Card className="border-2 border-emerald-200">
          <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base text-emerald-700">
                {data.courseSchedules.find((s) => s.id === selectedSchedule)?.name} -
                Kayıtlı Öğrenciler
              </CardTitle>
              <CardDescription>
                {studentsInLesson.length} öğrenci
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sınıf filtresi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {grades.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {gradeFilter && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGradeFilter("")}
                >
                  Temizle
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {canViewColumn("lessonStudents", "firstName") && (
                    <TableHead className="text-xs">Ad Soyad</TableHead>
                  )}
                  {canViewColumn("lessonStudents", "grade") && (
                    <TableHead className="text-xs">Sınıf</TableHead>
                  )}
                  {canViewColumn("lessonStudents", "school") && (
                    <TableHead className="text-xs">Okul</TableHead>
                  )}
                  {canViewColumn("lessonStudents", "parentName") && (
                    <TableHead className="text-xs">Veli</TableHead>
                  )}
                  {canViewColumn("lessonStudents", "parentPhone") && (
                    <TableHead className="text-xs">Veli Tel</TableHead>
                  )}
                  {canViewColumn("lessonStudents", "phone") && (
                    <TableHead className="text-xs">Öğrenci Tel</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsInLesson.map((s) => {
                  const sc = data.schools.find((x) => x.id === s.schoolId);
                  return (
                    <TableRow key={s.id} className="hover:bg-gray-50">
                      {canViewColumn("lessonStudents", "firstName") && (
                        <TableCell className="font-medium text-sm">
                          {s.firstName} {s.lastName}
                        </TableCell>
                      )}
                      {canViewColumn("lessonStudents", "grade") && (
                        <TableCell className="text-sm">{s.grade}</TableCell>
                      )}
                      {canViewColumn("lessonStudents", "school") && (
                        <TableCell className="text-sm">
                          {sc?.name || "-"}
                        </TableCell>
                      )}
                      {canViewColumn("lessonStudents", "parentName") && (
                        <TableCell className="text-sm">
                          {s.parentName}
                        </TableCell>
                      )}
                      {canViewColumn("lessonStudents", "parentPhone") && (
                        <TableCell className="text-sm">
                          {s.parentPhone}
                        </TableCell>
                      )}
                      {canViewColumn("lessonStudents", "phone") && (
                        <TableCell className="text-sm">{s.phone}</TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {studentsInLesson.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
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
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Ders Planı Düzenle" : "Yeni Ders Planı"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <div className="space-y-1">
              <Label className="text-xs">Kurs</Label>
              <Select
                value={String(form.courseId || "")}
                onValueChange={(v) => setForm({ ...form, courseId: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kurs seçin" />
                </SelectTrigger>
                <SelectContent>
                  {data.lessons.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sınıf</Label>
              <Select
                value={String(form.classRoomId || "")}
                onValueChange={(v) => setForm({ ...form, classRoomId: v ? Number(v) : null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sınıf seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Seçilmedi</SelectItem>
                  {data.classRooms.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Gün</Label>
              <Select
                value={form.dayOfWeek || ""}
                onValueChange={(v) => setForm({ ...form, dayOfWeek: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Başlangıç</Label>
                <Input
                  type="time"
                  value={form.startTime || ""}
                  onChange={(e) =>
                    setForm({ ...form, startTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bitiş</Label>
                <Input
                  type="time"
                  value={form.endTime || ""}
                  onChange={(e) =>
                    setForm({ ...form, endTime: e.target.value })
                  }
                />
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full">
              {editing ? "Güncelle" : "Ekle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={courseOpen} onOpenChange={setCourseOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kurs Yönetimi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Kurs adı"
                value={courseForm.name || ""}
                onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
              />
              <Input
                placeholder="Açıklama"
                value={courseForm.description || ""}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
              />
              <Select
                value={courseForm.schoolId ? String(courseForm.schoolId) : "none"}
                onValueChange={(v) =>
                  setCourseForm({
                    ...courseForm,
                    schoolId: v === "none" ? null : Number(v),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Medrese seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Medrese seçin</SelectItem>
                  {data.schools.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button onClick={handleCourseSubmit}>
                  {editingCourse ? "Güncelle" : "Ekle"}
                </Button>
                {editingCourse && (
                  <Button variant="outline" onClick={() => { setEditingCourse(null); setCourseForm({}); }}>
                    İptal
                  </Button>
                )}
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kurs</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Medrese</TableHead>
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lessons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">{c.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{c.description || "-"}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {data.schools.find((s) => s.id === c.schoolId)?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingCourse(c); setCourseForm(c); }}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Kurs silinsin mi?")) data.deleteCourse(c.id); }}>
                          <Trash2 size={14} className="text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toplu Kurs Atama Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Öğrencilere Kurs Ata</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="space-y-1 w-full sm:w-64">
                <Label className="text-xs">Kurs</Label>
                <Select
                  value={assignCourseId || "none"}
                  onValueChange={(v) => {
                    setAssignCourseId(v === "none" ? "" : v);
                    setSelectedStudentIds([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kurs seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kurs seçin</SelectItem>
                    {data.lessons.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 w-full sm:w-64">
                <Label className="text-xs">Öğrenci Ara</Label>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <Input
                    placeholder="İsim ara..."
                    value={assignSearch}
                    onChange={(e) => setAssignSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pb-1">
                <Switch
                  id="only-unassigned"
                  checked={assignOnlyUnassigned}
                  onCheckedChange={setAssignOnlyUnassigned}
                />
                <Label htmlFor="only-unassigned" className="text-xs cursor-pointer">
                  Sadece atanmamış öğrenciler
                </Label>
              </div>
            </div>

            {assignCourseId && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-gray-600">
                    {assignStudents.length} öğrenci listeleniyor
                    {selectedStudentIds.length > 0 &&
                      ` • ${selectedStudentIds.length} seçili`}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllAssignStudents}
                    >
                      Tümünü Seç
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deselectAllAssignStudents}
                    >
                      Seçimi Kaldır
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="text-xs">Öğrenci</TableHead>
                        <TableHead className="text-xs">Sınıf</TableHead>
                        <TableHead className="text-xs">Mevcut Kurslar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignStudents.map((s) => {
                        const courseNames = s.lessons
                          .map(
                            (id) => data.lessons.find((c) => c.id === id)?.name,
                          )
                          .filter(Boolean)
                          .join(", ");
                        return (
                          <TableRow key={s.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedStudentIds.includes(s.id)}
                                onChange={() => toggleStudentSelection(s.id)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {s.firstName} {s.lastName}
                            </TableCell>
                            <TableCell className="text-xs">{s.grade}</TableCell>
                            <TableCell className="text-xs text-gray-500">
                              {courseNames || "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {assignStudents.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-6 text-sm text-gray-500"
                          >
                            {assignOnlyUnassigned
                              ? "Bu kursa atanmamış öğrenci bulunamadı"
                              : "Öğrenci bulunamadı"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAssignOpen(false);
                  setAssignCourseId("");
                  setAssignSearch("");
                  setSelectedStudentIds([]);
                }}
              >
                İptal
              </Button>
              <Button
                onClick={handleAssignCourse}
                disabled={!assignCourseId || selectedStudentIds.length === 0}
              >
                {selectedStudentIds.length > 0
                  ? `${selectedStudentIds.length} Öğrenciye Ata`
                  : "Öğrenci Seçin"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
