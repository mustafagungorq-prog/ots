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
  Lesson,
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

// ====== CLASSES PAGE ======
export function ClassesPage() {
  const data = useStudentData();
  const { users, canEdit, usersLoaded, refreshUsers, currentUser } = useAuth();

  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRoom | null>(null);
  const [form, setForm] = useState<Partial<ClassRoom>>({
    active: true,
    lessonIds: [],
  });
  const [expandedClass, setExpandedClass] = useState<number | null>(null);
  const [expandedClassLesson, setExpandedClassLesson] = useState<{
    roomId: number;
    lessonId: number;
  } | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [transferRoomId, setTransferRoomId] = useState<number | null>(null);
  const [transferSelectedStudents, setTransferSelectedStudents] = useState<
    number[]
  >([]);
  const [transferAssignLessons, setTransferAssignLessons] = useState(true);
  const [lessonAddOpen, setLessonAddOpen] = useState<{
    roomId: number;
    lessonId: number;
  } | null>(null);
  const [lessonAddSelected, setLessonAddSelected] = useState<number[]>([]);

  useEffect(() => {
    data.loadClassRooms();
    data.loadSchools();
    data.loadLessons();
    data.loadCourseSchedules();
    data.loadStudents();
    refreshUsers();
  }, []);

  const goStudentPage = (studentId: number) => {
    navigate(
      canEdit ? `/student-form/${studentId}` : `/student-profile/${studentId}`,
    );
  };

  const getTeacherDisplayName = (teacher: any) => {
    return (
      teacher?.fullName || teacher?.full_name || teacher?.username || "Öğretmen"
    );
  };

  const handleSubmit = () => {
    if (!form.name || !form.grade) return;
    if (editing) data.updateClassRoom(editing.id, form);
    else data.addClassRoom(form as Omit<ClassRoom, "id" | "createdAt">);
    setOpen(false);
    setEditing(null);
    setForm({ active: true, lessonIds: [] });
  };

  const classRooms = selectedSchool
    ? data.classRooms.filter((c) => String(c.schoolId) === selectedSchool)
    : data.classRooms;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gruplar</h2>
        <div className="flex gap-2">
          <div className="w-48">
            <Select
              value={selectedSchool || "all"}
              onValueChange={(v) => setSelectedSchool(v === "all" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tüm okullar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Okullar</SelectItem>
                {data.schools.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setForm({
                active: true,
                lessonIds: [],
                schoolId:
                  currentUser?.role === "admin" && currentUser?.schoolId
                    ? currentUser.schoolId
                    : undefined,
              });
              setOpen(true);
            }}
          >
            <Plus size={18} className="mr-1" /> Grup Ekle
          </Button>
        </div>
      </div>

      {/* İlişki Ağacı: Sınıf → Dersler → Öğrenciler */}
      <div className="space-y-3">
        {classRooms.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <UsersRound size={48} className="mx-auto mb-4 opacity-50" />
            <p>Henüz grup yok. "Grup Ekle" butonu ile yeni grup oluşturun.</p>
          </div>
        )}
        {classRooms.map((room) => {
          const school = data.schools.find((s) => s.id === room.schoolId);
          const roomLessons = data.getClassRoomLessons(room.id);
          const roomStudents = data.getClassRoomStudents(room.id);
          const isExpanded = expandedClass === room.id;
          return (
            <Card
              key={room.id}
              className={`overflow-hidden transition-all ${isExpanded ? "ring-2 ring-emerald-200" : ""}`}
            >
              {/* Sınıf Başlık */}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() =>
                      setExpandedClass(isExpanded ? null : room.id)
                    }
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isExpanded ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700"}`}
                    >
                      <UsersRound size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        {room.name}
                        <Badge variant="outline" className="text-[10px]">
                          {room.grade}
                        </Badge>
                        <Badge
                          className={`text-[10px] ${room.active ? "bg-green-500" : "bg-gray-400"} text-white`}
                        >
                          {room.active ? "Aktif" : "Pasif"}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {school?.name || "-"} • {roomLessons.length} ders •{" "}
                        {roomStudents.length} öğrenci
                      </CardDescription>
                    </div>
                    {isExpanded ? (
                      <ChevronDown size={18} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={18} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(room);
                        setForm({ ...room });
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
                        if (confirm("Grup silinsin mi?"))
                          data.deleteClassRoom(room.id);
                      }}
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Açıkken: Dersler ve Öğrenciler */}
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="ml-5 border-l-2 border-emerald-200 pl-4 space-y-3">
                    {/* Dersler */}
                    {roomLessons.length > 0 ? (
                      roomLessons.map((lesson) => {
                        const lessonStudents = roomStudents.filter((s) =>
                          s.lessons.includes(lesson.courseId),
                        );
                        const isLessonExpanded =
                          expandedClassLesson?.roomId === room.id &&
                          expandedClassLesson?.lessonId === lesson.id;
                        return (
                          <div key={`${room.id}-${lesson.id}`}>
                            <div
                              className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50"
                              onClick={() =>
                                setExpandedClassLesson(
                                  isLessonExpanded
                                    ? null
                                    : { roomId: room.id, lessonId: lesson.id },
                                )
                              }
                            >
                              <BookOpenCheck
                                size={16}
                                className="text-blue-500"
                              />
                              <span className="text-sm font-medium">
                                {lesson.name}
                              </span>
                              <span className="text-xs text-gray-400">
                                ({lesson.startTime}-{lesson.endTime})
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] ml-auto"
                              >
                                {lessonStudents.length} öğrenci
                              </Badge>
                              {isLessonExpanded ? (
                                <ChevronDown
                                  size={14}
                                  className="text-gray-400"
                                />
                              ) : (
                                <ChevronRight
                                  size={14}
                                  className="text-gray-400"
                                />
                              )}
                            </div>
                            {/* Dersin Öğrencileri */}
                            {isLessonExpanded && (
                              <div className="ml-6 mt-2 space-y-2">
                                {/* Kayıtlı Öğrenciler */}
                                {lessonStudents.length > 0 ? (
                                  <div className="space-y-1">
                                    {lessonStudents.map((s) => (
                                      <div
                                        key={s.id}
                                        className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                                      >
                                        <div
                                          className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer"
                                          onClick={() => goStudentPage(s.id)}
                                        >
                                          {s.firstName[0]}
                                          {s.lastName[0]}
                                        </div>
                                        <span
                                          className="text-sm flex-1 cursor-pointer"
                                          onClick={() => goStudentPage(s.id)}
                                        >
                                          {s.firstName} {s.lastName}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => {
                                            if (
                                              confirm(
                                                `${s.firstName} ${s.lastName} bu dersten çıkarılsın mı?`,
                                              )
                                            )
                                              data.updateStudent(s.id, {
                                                lessons: s.lessons.filter(
                                                  (lid) => lid !== lesson.courseId,
                                                ),
                                              });
                                          }}
                                        >
                                          <X size={12} className="mr-1" /> Çıkar
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 py-2">
                                    Bu derse kayıtlı öğrenci yok
                                  </p>
                                )}

                                {/* Derse Öğrenci Ekle */}
                                {(() => {
                                  const unassigned = roomStudents.filter(
                                    (s) => !s.lessons.includes(lesson.courseId),
                                  );
                                  const isAddOpen =
                                    lessonAddOpen?.roomId === room.id &&
                                    lessonAddOpen?.lessonId === lesson.id;
                                  if (unassigned.length === 0) return null;
                                  return (
                                    <div className="pt-2 border-t border-dashed">
                                      {!isAddOpen ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs"
                                          onClick={() => {
                                            setLessonAddOpen({
                                              roomId: room.id,
                                              lessonId: lesson.id,
                                            });
                                            setLessonAddSelected([]);
                                          }}
                                        >
                                          <Plus size={12} className="mr-1" /> Bu
                                          Derse Öğrenci Ekle (
                                          {unassigned.length})
                                        </Button>
                                      ) : (
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-blue-700">
                                              Derse Eklenecek Öğrenciler
                                            </span>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={() =>
                                                setLessonAddOpen(null)
                                              }
                                            >
                                              <X size={14} />
                                            </Button>
                                          </div>
                                          <div className="max-h-40 overflow-y-auto space-y-1">
                                            {unassigned.map((s) => (
                                              <label
                                                key={s.id}
                                                className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs transition-colors ${lessonAddSelected.includes(s.id) ? "bg-blue-50 border border-blue-300" : "bg-gray-50 border border-transparent hover:bg-gray-100"}`}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={lessonAddSelected.includes(
                                                    s.id,
                                                  )}
                                                  onChange={() =>
                                                    setLessonAddSelected(
                                                      (prev) =>
                                                        prev.includes(s.id)
                                                          ? prev.filter(
                                                              (x) => x !== s.id,
                                                            )
                                                          : [...prev, s.id],
                                                    )
                                                  }
                                                  className="w-4 h-4 accent-blue-500 flex-shrink-0"
                                                />
                                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                                  {s.firstName[0]}
                                                  {s.lastName[0]}
                                                </div>
                                                <span className="flex-1">
                                                  {s.firstName} {s.lastName}
                                                </span>
                                              </label>
                                            ))}
                                          </div>
                                          <div className="flex gap-2">
                                            <Button
                                              size="sm"
                                              className="bg-blue-600 hover:bg-blue-700 text-xs"
                                              disabled={
                                                lessonAddSelected.length === 0
                                              }
                                              onClick={() => {
                                                lessonAddSelected.forEach(
                                                  (sid) => {
                                                    const st =
                                                      data.students.find(
                                                        (s) => s.id === sid,
                                                      );
                                                    if (st)
                                                      data.updateStudent(sid, {
                                                        lessons: [
                                                          ...st.lessons,
                                                          lesson.courseId,
                                                        ],
                                                      });
                                                  },
                                                );
                                                setLessonAddOpen(null);
                                                setLessonAddSelected([]);
                                              }}
                                            >
                                              <Plus
                                                size={12}
                                                className="mr-1"
                                              />{" "}
                                              {lessonAddSelected.length}{" "}
                                              Öğrenciyi Derse Ekle
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-xs"
                                              onClick={() =>
                                                setLessonAddOpen(null)
                                              }
                                            >
                                              İptal
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-400 py-2">
                        Bu gruba atanmış ders yok
                      </p>
                    )}

                    {/* Grup Öğretmenleri */}
                    <div className="pt-3 border-t border-purple-200">
                      <h4 className="text-sm font-medium text-purple-700 mb-2">
                        Grup Öğretmenleri
                      </h4>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {room.teacherIds.length > 0 ? (
                          room.teacherIds.map((tid) => {
                            const t = users.find((u) => u.id === tid);
                            return t ? (
                              <Badge
                                key={tid}
                                className="bg-purple-100 text-purple-700 border-purple-300 text-xs flex items-center gap-1"
                              >
                                <GraduationCap size={12} />{" "}
                                {getTeacherDisplayName(t)}
                                <button
                                  onClick={() =>
                                    data.unassignTeacherFromClassRoom(
                                      room.id,
                                      tid,
                                    )
                                  }
                                  className="ml-1 text-purple-400 hover:text-red-500"
                                >
                                  ×
                                </button>
                              </Badge>
                            ) : null;
                          })
                        ) : (
                          <span className="text-xs text-gray-400">
                            Atanmış öğretmen yok
                          </span>
                        )}
                      </div>
                      {/* Öğretmen ekle */}
                      {(() => {
                        const unassignedTeachers = users.filter(
                          (u) =>
                            (u.role === "teacher" ||
                              u.role === "authorized_teacher") &&
                            !room.teacherIds.includes(u.id),
                        );
                        if (unassignedTeachers.length === 0) return null;
                        return (
                          <Select
                            onValueChange={(v) => {
                              if (v)
                                data.assignTeacherToClassRoom(
                                  room.id,
                                  Number(v),
                                );
                            }}
                          >
                            <SelectTrigger className="w-56 h-8 text-xs">
                              <SelectValue placeholder="Öğretmen ekle..." />
                            </SelectTrigger>
                            <SelectContent>
                              {unassignedTeachers.map((t) => (
                                <SelectItem key={t.id} value={String(t.id)}>
                                  {getTeacherDisplayName(t)} (
                                  {t.role === "authorized_teacher"
                                    ? "Yetkili Öğr."
                                    : "Öğretmen"}
                                  )
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })()}
                    </div>

                    {/* Tüm Öğrenciler Özeti */}
                    <div className="pt-3 border-t">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Tüm Öğrenciler ({roomStudents.length})
                      </h4>
                      {roomStudents.length > 0 ? (
                        <div className="space-y-2">
                          {roomStudents.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                            >
                              <div
                                className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 cursor-pointer hover:bg-emerald-700"
                                onClick={() => goStudentPage(s.id)}
                              >
                                {s.firstName[0]}
                                {s.lastName[0]}
                              </div>
                              <div
                                className="min-w-0 flex-1 cursor-pointer"
                                onClick={() => goStudentPage(s.id)}
                              >
                                <p className="text-sm truncate">
                                  {s.firstName} {s.lastName}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  {s.city} • {s.age} yaş
                                </p>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <Select
                                  onValueChange={(v) => {
                                    if (v) {
                                      const targetRoomId = Number(v);
                                      if (
                                        confirm(
                                          `${s.firstName} ${s.lastName} bu gruba taşınacak mı?`,
                                        )
                                      ) {
                                        data.updateStudent(s.id, {
                                          groupId: targetRoomId,
                                        });
                                      }
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-[10px] w-28">
                                    <SelectValue placeholder="Gruba Taşı" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {data.classRooms
                                      .filter(
                                        (c) => c.id !== room.id && c.active,
                                      )
                                      .map((cr) => (
                                        <SelectItem
                                          key={cr.id}
                                          value={String(cr.id)}
                                        >
                                          {cr.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `${s.firstName} ${s.lastName} bu gruptan silinecek mi?`,
                                      )
                                    ) {
                                      data.updateStudent(s.id, {
                                        groupId: null,
                                      });
                                    }
                                  }}
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">
                          Bu gruba kayıtlı öğrenci yok
                        </p>
                      )}
                    </div>

                    {/* Bu Gruba Öğrenci Aktar */}
                    <div className="pt-3 border-t border-dashed border-orange-300">
                      {transferRoomId === room.id ? (
                        (() => {
                          const unassignedStudents = data.students.filter(
                            (s) => !s.groupId,
                          );
                          const ts = transferSelectedStudents;
                          return (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-orange-700">
                                  Bu Gruba Öğrenci Aktar (
                                  {unassignedStudents.length} boşta)
                                </h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setTransferRoomId(null);
                                    setTransferSelectedStudents([]);
                                  }}
                                >
                                  <X size={14} />
                                </Button>
                              </div>
                              {unassignedStudents.length > 0 ? (
                                <>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                                    {unassignedStudents.map((s) => (
                                      <label
                                        key={s.id}
                                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${ts.includes(s.id) ? "bg-orange-50 border border-orange-300" : "bg-gray-50 border border-transparent hover:bg-gray-100"}`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={ts.includes(s.id)}
                                          onChange={() =>
                                            setTransferSelectedStudents(
                                              (prev) =>
                                                prev.includes(s.id)
                                                  ? prev.filter(
                                                      (x) => x !== s.id,
                                                    )
                                                  : [...prev, s.id],
                                            )
                                          }
                                          className="w-4 h-4 accent-orange-500 flex-shrink-0"
                                        />
                                        <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                          {s.firstName[0]}
                                          {s.lastName[0]}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm truncate">
                                            {s.firstName} {s.lastName}
                                          </p>
                                          <p className="text-[10px] text-gray-400">
                                            {s.grade} • {s.city}
                                          </p>
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`tl-${room.id}`}
                                      checked={transferAssignLessons}
                                      onChange={(e) =>
                                        setTransferAssignLessons(
                                          e.target.checked,
                                        )
                                      }
                                      className="w-4 h-4 accent-emerald-600"
                                    />
                                    <label
                                      htmlFor={`tl-${room.id}`}
                                      className="text-xs cursor-pointer"
                                    >
                                      Grubun derslerini de öğrenciye ata
                                    </label>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        if (
                                          transferSelectedStudents.length === 0
                                        )
                                          return;
                                        const lessonIds = transferAssignLessons
                                          ? room.lessonIds
                                          : [];
                                        transferSelectedStudents.forEach(
                                          (sid) => {
                                            const st = data.students.find(
                                              (s) => s.id === sid,
                                            );
                                            if (!st) return;
                                            const newLessons =
                                              transferAssignLessons
                                                ? Array.from(
                                                    new Set([
                                                      ...st.lessons,
                                                      ...lessonIds,
                                                    ]),
                                                  )
                                                : st.lessons;
                                            data.updateStudent(sid, {
                                              groupId: room.id,
                                              lessons: newLessons,
                                            });
                                          },
                                        );
                                        setTransferSelectedStudents([]);
                                        setTransferRoomId(null);
                                        alert(
                                          `${transferSelectedStudents.length} öğrenci ${room.name} grubuna aktarıldı${transferAssignLessons ? " ve derslere atandı" : ""}`,
                                        );
                                      }}
                                      disabled={
                                        transferSelectedStudents.length === 0
                                      }
                                      className="bg-orange-600 hover:bg-orange-700"
                                    >
                                      <UsersRound size={14} className="mr-1" />{" "}
                                      {transferSelectedStudents.length}{" "}
                                      Öğrenciyi Aktar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setTransferRoomId(null);
                                        setTransferSelectedStudents([]);
                                      }}
                                    >
                                      İptal
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <p className="text-xs text-gray-400">
                                  Boşta öğrenci yok
                                </p>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600 border-orange-300 hover:bg-orange-50"
                          onClick={() => {
                            setTransferRoomId(room.id);
                            setTransferSelectedStudents([]);
                          }}
                        >
                          <UsersRound size={14} className="mr-1" /> Bu Gruba
                          Öğrenci Aktar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Grup Düzenle" : "Yeni Grup"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <div className="space-y-1">
              <Label className="text-xs">Grup Adı *</Label>
              <Input
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Örn: 6-A Grubu"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Grup Seviyesi *</Label>
                <Select
                  value={form.grade || ""}
                  onValueChange={(v) => setForm({ ...form, grade: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "1. Sınıf",
                      "2. Sınıf",
                      "3. Sınıf",
                      "4. Sınıf",
                      "5. Sınıf",
                      "6. Sınıf",
                      "7. Sınıf",
                      "8. Sınıf",
                      "9. Sınıf",
                      "10. Sınıf",
                      "11. Sınıf",
                      "12. Sınıf",
                    ].map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Medrese *</Label>
                <Select
                  value={String(form.schoolId || "")}
                  onValueChange={(v) =>
                    setForm({ ...form, schoolId: Number(v) })
                  }
                  disabled={currentUser?.role === "admin"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Okul seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.schools.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Açıklama</Label>
              <Textarea
                value={form.description || ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Grup açıklaması..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Dersler</Label>
              <div className="flex flex-wrap gap-2">
                {data.lessons.map((l) => {
                  const selected = (form.lessonIds || []).includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          lessonIds: selected
                            ? (form.lessonIds || []).filter(
                                (id: number) => id !== l.id,
                              )
                            : [...(form.lessonIds || []), l.id],
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${selected ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.active ?? true}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
              <Label className="text-xs">Aktif</Label>
            </div>
            <Button onClick={handleSubmit} className="w-full">
              {editing ? "Güncelle" : "Ekle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
