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
import { Loading } from "@/components/Loading";
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

// ====== TEACHER LESSONS PAGE (Öğretmen Dersleri) ======
export function TeacherLessonsPage() {
  const data = useStudentData();
  const {
    currentUser,
    users,
    assignLessonToTeacher,
    unassignLessonFromTeacher,
    getAssignedLessons,
    usersLoaded,
    refreshUsers,
    teacherLessonsLoaded,
    refreshTeacherLessons,
  } = useAuth();
  const isAdmin =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";
  const teachers = users.filter(
    (u) => u.role === "teacher" || u.role === "authorized_teacher",
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(
    currentUser?.id || 0,
  );
  const [selLesson, setSelLesson] = useState<number | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);
  const [progDate, setProgDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [kuranPages, setKuranPages] = useState("");
  const [kuranCurrent, setKuranCurrent] = useState("");
  const [risalePages, setRisalePages] = useState("");
  const [risaleCurrent, setRisaleCurrent] = useState("");
  const [elifbaCurrent, setElifbaCurrent] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    data.loadStudents();
    data.loadLessons();
    data.loadProgress();
    refreshUsers();
    refreshTeacherLessons();
  }, []);
  /*
  if (data.loadingStudents || data.loadingLessons || data.loadingProgress || !usersLoaded || !teacherLessonsLoaded) {
    return <Loading />;
  }*/

  if (!currentUser) return null;
  const activeTeacherId = isAdmin ? selectedTeacherId : currentUser.id;
  const assignedLessonIds = getAssignedLessons(activeTeacherId);
  const myLessons = data.lessons.filter((l) =>
    assignedLessonIds.includes(l.id),
  );
  const allLessons = data.lessons.filter(
    (l) => !assignedLessonIds.includes(l.id),
  );
  const activeTeacher = teachers.find((t) => t.id === activeTeacherId);

  const studentsInLesson = selLesson
    ? data.students.filter((s) => s.lessons.includes(selLesson))
    : [];

  const handleSaveProgress = (studentId: number) => {
    data.addProgress({
      studentId,
      date: progDate,
      kuranPages: Number(kuranPages) || 0,
      kuranCurrentPage: Number(kuranCurrent) || 0,
      risalePages: Number(risalePages) || 0,
      risaleCurrentPage: Number(risaleCurrent) || 0,
      elifbaCurrentPage: Number(elifbaCurrent) || 0,
      notes,
    });
    setKuranPages("");
    setKuranCurrent("");
    setRisalePages("");
    setRisaleCurrent("");
    setElifbaCurrent("");
    setNotes("");
    setExpandedStudent(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Öğretmen Dersleri
        </h2>
        <Badge variant="outline" className="text-sm w-fit">
          {myLessons.length} ders atanmış
        </Badge>
      </div>

      {/* Admin icin ogretmen secimi */}
      {isAdmin && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-1 max-w-md">
              <Label className="text-xs">Öğretmen Seçin</Label>
              <Select
                value={String(selectedTeacherId)}
                onValueChange={(v) => {
                  setSelectedTeacherId(Number(v));
                  setSelLesson(null);
                  setExpandedStudent(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Öğretmen seçin" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.fullName || t.username} ({ROLE_LABELS[t.role]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Ders Atama
            {activeTeacher
              ? ` - ${activeTeacher.fullName || activeTeacher.username}`
              : ""}
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? "Seçili öğretmene ders atayın veya çıkarın"
              : "Kendinize ders atayın veya çıkarın"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {allLessons.map((l) => (
              <Button
                key={l.id}
                size="sm"
                variant="outline"
                onClick={() => assignLessonToTeacher(activeTeacherId, l.id)}
                className="flex items-center gap-1"
              >
                <Plus size={14} /> {l.name}
              </Button>
            ))}
            {allLessons.length === 0 && (
              <p className="text-sm text-gray-500">Tüm dersler atanmış</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {myLessons.map((l) => (
              <div
                key={l.id}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selLesson === l.id ? "bg-emerald-600 text-white" : "bg-gray-900 text-white hover:bg-gray-800"}`}
              >
                <button
                  type="button"
                  className="flex items-center gap-1"
                  onClick={() => {
                    setSelLesson(l.id);
                    setExpandedStudent(null);
                  }}
                >
                  {l.name}
                </button>
                <button
                  type="button"
                  className="ml-1 p-0.5 rounded-full hover:bg-red-500/30 transition-colors"
                  onClick={() => {
                    unassignLessonFromTeacher(activeTeacherId, l.id);
                    if (selLesson === l.id) setSelLesson(null);
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {myLessons.length === 0 && (
              <p className="text-sm text-gray-500">Henüz ders atanmamış</p>
            )}
          </div>
        </CardContent>
      </Card>

      {selLesson && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {data.lessons.find((l) => l.id === selLesson)?.name} -{" "}
              {studentsInLesson.length} Öğrenci
            </CardTitle>
            <CardDescription>
              Öğrenciye tıklayarak gelişim girişi yapın
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {studentsInLesson.map((student) => {
                const isExpanded = expandedStudent === student.id;
                const lastProg = data.progress
                  .filter((p) => p.studentId === student.id)
                  .slice(-1)[0];
                return (
                  <div key={student.id}>
                    <div
                      onClick={() =>
                        setExpandedStudent(isExpanded ? null : student.id)
                      }
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${isExpanded ? "bg-emerald-600" : "bg-gray-400"}`}
                        >
                          {student.firstName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {student.grade} • {student.city}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {lastProg && (
                          <div className="flex gap-2 text-xs text-gray-500 hidden sm:flex">
                            <span>K: S.{lastProg.kuranCurrentPage}</span>
                            <span>R: S.{lastProg.risaleCurrentPage}</span>
                            <span>E: S.{lastProg.elifbaCurrentPage}</span>
                          </div>
                        )}
                        <ChevronDown
                          size={18}
                          className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="p-4 bg-emerald-50 border-t border-emerald-100 space-y-3">
                        {lastProg && (
                          <p className="text-xs text-gray-600">
                            Son kayıt: {lastProg.date} | Kuran S.
                            {lastProg.kuranCurrentPage} | Risale S.
                            {lastProg.risaleCurrentPage} | Elif-ba S.
                            {lastProg.elifbaCurrentPage}
                          </p>
                        )}
                        <div className="space-y-1">
                          <Label className="text-xs">Tarih</Label>
                          <Input
                            type="date"
                            value={progDate}
                            onChange={(e) => setProgDate(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Kuran Okunan</Label>
                            <Input
                              type="number"
                              value={kuranPages}
                              onChange={(e) => setKuranPages(e.target.value)}
                              placeholder="Sayfa"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Kuran Son</Label>
                            <Input
                              type="number"
                              value={kuranCurrent}
                              onChange={(e) => setKuranCurrent(e.target.value)}
                              placeholder="Sayfa"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Risale Okunan</Label>
                            <Input
                              type="number"
                              value={risalePages}
                              onChange={(e) => setRisalePages(e.target.value)}
                              placeholder="Sayfa"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Risale Son</Label>
                            <Input
                              type="number"
                              value={risaleCurrent}
                              onChange={(e) => setRisaleCurrent(e.target.value)}
                              placeholder="Sayfa"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Elif-ba Son</Label>
                            <Input
                              type="number"
                              value={elifbaCurrent}
                              onChange={(e) => setElifbaCurrent(e.target.value)}
                              placeholder="Sayfa"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Notlar</Label>
                            <Textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Not..."
                              rows={1}
                            />
                          </div>
                        </div>
                        <Button
                          onClick={() => handleSaveProgress(student.id)}
                          className="w-full"
                        >
                          <Save size={16} className="mr-2" /> Kaydet
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {studentsInLesson.length === 0 && (
                <p className="text-center py-8 text-gray-500">
                  Bu derse kayıtlı öğrenci yok
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
