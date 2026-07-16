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

// ====== STUDENT POPUP ======
export function StudentPopup({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const data = useStudentData();
  const { canMarkAttendance, canCreateProgress } = useAuth();
  const [tab, setTab] = useState<"attendance" | "progress">("attendance");
  const today = new Date().toISOString().split("T")[0];
  const [attDate, setAttDate] = useState(today);
  const [attNote, setAttNote] = useState("");
  const [progDate, setProgDate] = useState(today);
  const [kuranPages, setKuranPages] = useState("");
  const [kuranCurrent, setKuranCurrent] = useState("");
  const [risalePages, setRisalePages] = useState("");
  const [risaleCurrent, setRisaleCurrent] = useState("");
  const [elifbaCurrent, setElifbaCurrent] = useState("");
  const [progNotes, setProgNotes] = useState("");

  useEffect(() => {
    data.loadClassRooms();
    data.loadAttendance();
    data.loadProgress();
    data.loadSchools();
  }, []);
  /*
  if (data.loadingLessons || data.loadingAttendance || data.loadingProgress || data.loadingSchools) {
    return <Loading />;
  }*/

  const statusC: Record<string, string> = {
    present: "bg-green-500",
    absent: "bg-red-500",
    late: "bg-yellow-500",
    excused: "bg-blue-500",
  };
  const statusL: Record<string, string> = {
    present: "Mevcut",
    absent: "Yok",
    late: "Geç",
    excused: "İzinli",
  };
  const lastProg = data.progress
    .filter((p) => p.studentId === student.id)
    .slice(-1)[0];

  const markAtt = (status: Attendance["status"]) => {
    const ex = data.attendance.find(
      (a) => a.studentId === student.id && a.date === attDate,
    );
    if (ex) data.updateAttendanceStatus(ex.id, status);
    else
      data.addAttendance({
        studentId: student.id,
        classRoomId: student.groupId ?? null,
        date: attDate,
        status,
        note: attNote || undefined,
      });
  };
  const getAttStatus = (date: string) =>
    data.attendance.find(
      (a) => a.studentId === student.id && a.date === date,
    )?.status || null;
  const saveProg = () => {
    data.addProgress({
      studentId: student.id,
      date: progDate,
      kuranPages: Number(kuranPages) || 0,
      kuranCurrentPage: Number(kuranCurrent) || 0,
      risalePages: Number(risalePages) || 0,
      risaleCurrentPage: Number(risaleCurrent) || 0,
      elifbaCurrentPage: Number(elifbaCurrent) || 0,
      notes: progNotes,
    });
    setKuranPages("");
    setKuranCurrent("");
    setRisalePages("");
    setRisaleCurrent("");
    setElifbaCurrent("");
    setProgNotes("");
  };

  return (
    <Dialog open={!!student} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto p-0">
        <div className="bg-emerald-600 text-white p-4 sm:p-6 rounded-t-lg">
          <h2 className="text-xl sm:text-2xl font-bold">
            {student.firstName} {student.lastName}
          </h2>
          <p className="text-emerald-100 text-sm mt-1">
            {student.grade} •{" "}
            {data.schools.find((sc) => sc.id === student.schoolId)?.name || "-"}{" "}
            • {student.city}
          </p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-emerald-100">
            <span>Tel: {student.phone}</span>
            <span>Veli: {student.parentName}</span>
            <span>Veli Tel: {student.parentPhone}</span>
          </div>
        </div>
        <div className="px-4 sm:px-6 pt-4">
          <div className="overflow-x-auto overflow-y-hidden border-b">
            <div className="flex min-w-max whitespace-nowrap">
              {canMarkAttendance && (
                <button
                  onClick={() => setTab("attendance")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "attendance" ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500"}`}
                >
                  <ClipboardCheck size={16} className="inline mr-1" />
                  Yoklama
                </button>
              )}
              {canCreateProgress && (
                <button
                  onClick={() => setTab("progress")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "progress" ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500"}`}
                >
                  <TrendingUp size={16} className="inline mr-1" />
                  İlerleme
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 pt-2">
          {tab === "attendance" && canMarkAttendance ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tarih</Label>
                  <Input
                    type="date"
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1 flex-1 min-w-[200px]">
                  <Label className="text-xs">Not</Label>
                  <Input
                    value={attNote}
                    onChange={(e) => setAttNote(e.target.value)}
                    placeholder="Not..."
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(["present", "absent", "late", "excused"] as const).map(
                  (s) => {
                    const cs = getAttStatus(attDate);
                    return (
                      <Button
                        key={s}
                        size="sm"
                        variant={cs === s ? "default" : "outline"}
                        className={cs === s ? statusC[s] : ""}
                        onClick={() => markAtt(s)}
                      >
                        {statusL[s]}
                      </Button>
                    );
                  },
                )}
              </div>
              <div className="mt-4">
                <h4 className="font-medium text-sm mb-2">Yoklama Geçmişi</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Tarih</TableHead>
                        <TableHead className="text-xs">Sınıf</TableHead>
                        <TableHead className="text-xs">Durum</TableHead>
                        <TableHead className="text-xs">Not</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.attendance
                        .filter((a) => a.studentId === student.id)
                        .slice()
                        .reverse()
                        .slice(0, 10)
                        .map((a) => {
                          const cr = data.classRooms.find(
                            (x) => x.id === a.classRoomId,
                          );
                          return (
                            <TableRow key={a.id}>
                              <TableCell className="text-xs">
                                {a.date}
                              </TableCell>
                              <TableCell className="text-xs">
                                {cr?.name || "-"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`${statusC[a.status]} text-xs`}
                                >
                                  {statusL[a.status]}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-gray-500">
                                {a.note || "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      {data.attendance.filter((a) => a.studentId === student.id)
                        .length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-xs text-gray-500 py-4"
                          >
                            Kayıt yok
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {lastProg && (
                <Card className="bg-blue-50">
                  <CardContent className="p-3">
                    <p className="text-xs text-gray-600 mb-2">
                      Son Durum ({lastProg.date}):
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white p-2 rounded">
                        <p className="text-xs text-gray-500">Kuran</p>
                        <p className="font-bold text-green-700">
                          S.{lastProg.kuranCurrentPage}
                        </p>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <p className="text-xs text-gray-500">Risale</p>
                        <p className="font-bold text-purple-700">
                          S.{lastProg.risaleCurrentPage}
                        </p>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <p className="text-xs text-gray-500">Elif-ba</p>
                        <p className="font-bold text-orange-700">
                          S.{lastProg.elifbaCurrentPage}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Tarih</Label>
                <Input
                  type="date"
                  value={progDate}
                  onChange={(e) => setProgDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Kuran Okunan</Label>
                  <Input
                    type="number"
                    value={kuranPages}
                    onChange={(e) => setKuranPages(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Kuran Son</Label>
                  <Input
                    type="number"
                    value={kuranCurrent}
                    onChange={(e) => setKuranCurrent(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Risale Okunan</Label>
                  <Input
                    type="number"
                    value={risalePages}
                    onChange={(e) => setRisalePages(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Risale Son</Label>
                  <Input
                    type="number"
                    value={risaleCurrent}
                    onChange={(e) => setRisaleCurrent(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Elif-ba Son</Label>
                <Input
                  type="number"
                  value={elifbaCurrent}
                  onChange={(e) => setElifbaCurrent(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notlar</Label>
                <Textarea
                  value={progNotes}
                  onChange={(e) => setProgNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <Button onClick={saveProg} className="w-full">
                <Save size={16} className="mr-2" /> Kaydet
              </Button>
              <div className="mt-4">
                <h4 className="font-medium text-sm mb-2">Tüm Kayıtlar</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Tarih</TableHead>
                        <TableHead className="text-xs">Kuran</TableHead>
                        <TableHead className="text-xs">Risale</TableHead>
                        <TableHead className="text-xs">Elif-ba</TableHead>
                        <TableHead className="text-xs">Not</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.progress
                        .filter((p) => p.studentId === student.id)
                        .slice()
                        .reverse()
                        .map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-xs">{p.date}</TableCell>
                            <TableCell className="text-xs">
                              +{p.kuranPages}/S.{p.kuranCurrentPage}
                            </TableCell>
                            <TableCell className="text-xs">
                              +{p.risalePages}/S.{p.risaleCurrentPage}
                            </TableCell>
                            <TableCell className="text-xs">
                              S.{p.elifbaCurrentPage}
                            </TableCell>
                            <TableCell className="text-xs text-gray-500 max-w-[150px] truncate">
                              {p.notes}
                            </TableCell>
                          </TableRow>
                        ))}
                      {data.progress.filter((p) => p.studentId === student.id)
                        .length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-xs text-gray-500 py-4"
                          >
                            Kayıt yok
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ====== STUDENTS PAGE ======
export function StudentsPage() {
  const data = useStudentData();
  const { canViewColumn, canCreate, canEdit, canDelete } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [popupStudent, setPopupStudent] = useState<Student | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [groupTransferOpen, setGroupTransferOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [assignLessons, setAssignLessons] = useState(true);

  useEffect(() => {
    data.loadStudents();
    data.loadSchools();
    data.loadLessons();
    data.loadClassRooms();
  }, []);
  /*
  if (data.loadingStudents || data.loadingSchools || data.loadingLessons || data.loadingClassRooms) {
    return <Loading />;
  }*/

  const filtered = data.students
    .filter(
      (s) =>
        `${s.firstName} ${s.lastName}`
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        s.city.toLowerCase().includes(search.toLowerCase()) ||
        s.grade.toLowerCase().includes(search.toLowerCase()) ||
        s.parentName.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`,
        "tr",
      ),
    );

  const toggleSelection = (id: number) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const selectAll = () => setSelectedStudents(filtered.map((s) => s.id));
  const deselectAll = () => setSelectedStudents([]);

  const handleGroupTransfer = () => {
    if (!selectedGroupId || selectedStudents.length === 0) return;
    const groupId = Number(selectedGroupId);
    const group = data.classRooms.find((c) => c.id === groupId);
    if (!group) return;
    const lessonIds = group.lessonIds;
    selectedStudents.forEach((sid) => {
      const student = data.students.find((s) => s.id === sid);
      if (!student) return;
      const newLessons = assignLessons
        ? Array.from(new Set([...student.lessons, ...lessonIds]))
        : student.lessons;
      data.updateStudent(sid, { groupId, lessons: newLessons });
    });
    setGroupTransferOpen(false);
    setSelectedStudents([]);
    setSelectedGroupId("");
    alert(
      `${selectedStudents.length} öğrenci ${group.name} grubuna aktarıldı${assignLessons ? " ve derslere atandı" : ""}`,
    );
  };

  const handleRowDoubleClick = (student: Student) => {
    if (canEdit) {
      navigate(`/student-form/${student.id}`, { state: { student } });
      return;
    }
    setPopupStudent(student);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Öğrenciler
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <Input
              placeholder="Ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {canCreate && (
            <Button onClick={() => navigate("/student-form")}>
              <Plus size={18} className="mr-1" /> Ekle
            </Button>
          )}
        </div>
      </div>

      {/* Seçim toolbar + Gruba Aktar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={selectAll}>
          <CheckSquare size={14} className="mr-1" /> Tümünü Seç
        </Button>
        <Button size="sm" variant="outline" onClick={deselectAll}>
          <X size={14} className="mr-1" /> Temizle
        </Button>
        {selectedStudents.length > 0 && (
          <Button
            size="sm"
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setGroupTransferOpen(true)}
          >
            <UsersRound size={14} className="mr-1" /> {selectedStudents.length}{" "}
            Öğrenciyi Gruba Aktar
          </Button>
        )}
        {selectedStudents.length > 0 && (
          <Badge
            variant="outline"
            className="text-emerald-600 border-emerald-300"
          >
            {selectedStudents.length} seçili
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-8">✓</TableHead>
                {canViewColumn("students", "firstName") && (
                  <TableHead className="text-xs">Ad Soyad</TableHead>
                )}
                {canViewColumn("students", "grade") && (
                  <TableHead className="text-xs">Sınıf</TableHead>
                )}
                {canViewColumn("students", "school") && (
                  <TableHead className="text-xs">Medrese</TableHead>
                )}
                {canViewColumn("students", "group") && (
                  <TableHead className="text-xs">Grup</TableHead>
                )}
                {canViewColumn("students", "age") && (
                  <TableHead className="text-xs">Yaş</TableHead>
                )}
                {canViewColumn("students", "city") && (
                  <TableHead className="text-xs">Memleket</TableHead>
                )}
                {canViewColumn("students", "lessons") && (
                  <TableHead className="text-xs">Dersler</TableHead>
                )}
                {canViewColumn("students", "actions") && (
                  <TableHead className="text-xs">İşlem</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const sc = data.schools.find((x) => x.id === s.schoolId);
                const group = data.classRooms.find((c) => c.id === s.groupId);
                const sl = data.lessons.filter((l) => s.lessons.includes(l.id));
                return (
                  <TableRow
                    key={s.id}
                    onClick={() => navigate(`/student-profile/${s.id}`)}
                    onDoubleClick={() => handleRowDoubleClick(s)}
                    className={`cursor-pointer hover:bg-blue-50 ${selectedStudents.includes(s.id) ? "bg-emerald-50" : ""}`}
                    title="Tıklayın: Profil • Çift tıklayın: Güncelle"
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(s.id)}
                        onChange={() => toggleSelection(s.id)}
                        className="w-4 h-4 accent-emerald-600 cursor-pointer"
                      />
                    </TableCell>
                    {canViewColumn("students", "firstName") && (
                      <TableCell className="font-medium text-sm">
                        {s.firstName} {s.lastName}
                      </TableCell>
                    )}
                    {canViewColumn("students", "grade") && (
                      <TableCell className="text-sm">{s.grade}</TableCell>
                    )}
                    {canViewColumn("students", "school") && (
                      <TableCell className="text-sm">
                        {sc?.name || "-"}
                      </TableCell>
                    )}
                    {canViewColumn("students", "group") && (
                      <TableCell>
                        {group ? (
                          <Badge className="text-[10px] bg-emerald-500 text-white">
                            {group.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                    )}
                    {canViewColumn("students", "age") && (
                      <TableCell className="text-sm">{s.age}</TableCell>
                    )}
                    {canViewColumn("students", "city") && (
                      <TableCell className="text-sm">{s.city}</TableCell>
                    )}
                    {canViewColumn("students", "lessons") && (
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {sl.slice(0, 2).map((l) => (
                            <Badge
                              key={l.id}
                              variant="outline"
                              className="text-[10px]"
                            >
                              {l.name}
                            </Badge>
                          ))}
                          {sl.length > 2 && (
                            <span className="text-xs text-gray-400">
                              +{sl.length - 2}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {canViewColumn("students", "actions") && (
                      <TableCell>
                        <div className="flex gap-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/student-form/${s.id}`, {
                                  state: { student: s },
                                });
                              }}
                              title="Öğrenciyi güncelle"
                            >
                              <Pencil size={14} />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Silinsin mi?"))
                                  data.deleteStudent(s.id);
                              }}
                            >
                              <Trash2 size={14} className="text-red-500" />
                            </Button>
                          )}
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

      {/* Gruba Aktar Dialog */}
      <Dialog open={groupTransferOpen} onOpenChange={setGroupTransferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedStudents.length} Öğrenciyi Gruba Aktar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Hedef Grup *</Label>
              <Select
                value={selectedGroupId}
                onValueChange={setSelectedGroupId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Grup seçin" />
                </SelectTrigger>
                <SelectContent>
                  {data.classRooms
                    .filter((c) => c.active)
                    .map((cr) => (
                      <SelectItem key={cr.id} value={String(cr.id)}>
                        {cr.name} ({cr.grade}) - {cr.lessonIds.length} ders
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {selectedGroupId && (
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-xs text-emerald-700 font-medium">
                  {
                    data.classRooms.find(
                      (c) => c.id === Number(selectedGroupId),
                    )?.name
                  }{" "}
                  dersleri:
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.classRooms
                    .find((c) => c.id === Number(selectedGroupId))
                    ?.lessonIds.map((lid) => {
                      const l = data.lessons.find((x) => x.id === lid);
                      return l ? (
                        <Badge
                          key={lid}
                          variant="outline"
                          className="text-[10px] border-emerald-300 text-emerald-700"
                        >
                          {l.name}
                        </Badge>
                      ) : null;
                    })}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="assign-lessons"
                checked={assignLessons}
                onChange={(e) => setAssignLessons(e.target.checked)}
                className="w-4 h-4 accent-emerald-600"
              />
              <Label
                htmlFor="assign-lessons"
                className="text-xs cursor-pointer"
              >
                Grubun derslerini de öğrenciye ata
              </Label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleGroupTransfer}
                disabled={!selectedGroupId}
                className="flex-1"
              >
                <UsersRound size={16} className="mr-1" /> Aktar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setGroupTransferOpen(false);
                  setSelectedGroupId("");
                }}
              >
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {popupStudent && (
        <StudentPopup
          student={popupStudent}
          onClose={() => setPopupStudent(null)}
        />
      )}
    </div>
  );
}
