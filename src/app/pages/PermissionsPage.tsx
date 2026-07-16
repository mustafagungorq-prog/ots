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
import { apiDelete, apiGet, apiPost, apiPut } from "@/hooks/useApi";
import {
  validateUserForm,
  type UserFormErrors,
} from "@/lib/userValidation";
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
  MemorizationCriteria,
  MemorizationMode,
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

// ====== PERMISSIONS PAGE ======
export function PermissionsPage() {
  const data = useStudentData();
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    currentUser,
    getColumnsForGrid,
    updateGridColumnPermission,
    resetGridColumnsToDefaults,
    permissionMatrix,
    updatePermissionMatrixEntry,
    resetPermissionMatrix,
    getAssignedLessons,
    assignLessonToTeacher,
    unassignLessonFromTeacher,
    usersLoaded,
    refreshUsers,
    teacherLessonsLoaded,
    refreshTeacherLessons,
  } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "users" | "matrix" | "teacherLinks" | "gridColumns" | "settings"
  >("users");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<Partial<User>>({ active: true });
  const [showPw, setShowPw] = useState(false);
  const [selectedGrid, setSelectedGrid] = useState("students");
  const [selectedParentStudentId, setSelectedParentStudentId] =
    useState<string>("");
  const [subTopicRequired, setSubTopicRequired] = useState(false);
  const [savingSubTopicSetting, setSavingSubTopicSetting] = useState(false);
  const [memorizationMode, setMemorizationMode] = useState<MemorizationMode>("simple");
  const [savingMemorizationMode, setSavingMemorizationMode] = useState(false);
  const [criteriaDialogOpen, setCriteriaDialogOpen] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<MemorizationCriteria | null>(null);
  const [criteriaForm, setCriteriaForm] = useState<Partial<MemorizationCriteria>>({
    maxScore: 100,
    weight: 1,
    active: true,
    sortOrder: 0,
  });
  const [formErrors, setFormErrors] = useState<UserFormErrors>({});
  const formValid = useMemo(() => {
    const { valid } = validateUserForm(
      form,
      selectedParentStudentId,
      users,
      editing?.id,
    );
    return valid;
  }, [form, selectedParentStudentId, users, editing]);

  useEffect(() => {
    data.loadStudents();
    data.loadLessons();
    refreshUsers();
    refreshTeacherLessons();
    apiGet<{ value?: string }>("system-settings/sub_topic_required")
      .then((d) => setSubTopicRequired(String(d.value).toLowerCase() === "true"))
      .catch(() => setSubTopicRequired(false));
    apiGet<{ value?: string }>("system-settings/memorization_mode")
      .then((d) => {
        const mode = d.value as MemorizationMode;
        setMemorizationMode(["simple", "scoring", "detailed"].includes(mode) ? mode : "simple");
      })
      .catch(() => setMemorizationMode("simple"));
    data.loadMemorizationCriteria();
  }, []);
  /*
  if (data.loadingStudents || data.loadingLessons || !usersLoaded || !teacherLessonsLoaded) {
    return <Loading />;
  }*/

  const clearParentLinks = async (parentUserId: number) => {
    try {
      const links = await apiGet<any[]>("parent-student-links");
      const parentLinks = links.filter(
        (l) => Number(l.parent_user_id) === parentUserId,
      );
      for (const link of parentLinks) {
        await apiDelete(
          `parent-student-links?parentUserId=${parentUserId}&studentId=${Number(link.student_id)}`,
        );
      }
    } catch {
      // Ignore cleanup failures to avoid blocking user update flow.
    }
  };

  const loadParentLinkedStudent = async (parentUserId: number) => {
    try {
      const links = await apiGet<any[]>("parent-student-links");
      const match = links.find(
        (l) => Number(l.parent_user_id) === parentUserId,
      );
      setSelectedParentStudentId(match ? String(match.student_id) : "");
    } catch {
      setSelectedParentStudentId("");
    }
  };

  const handleSubmit = async () => {
    const { valid, errors } = validateUserForm(
      form,
      selectedParentStudentId,
      users,
      editing?.id,
    );
    if (!valid) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    if (editing) {
      await updateUser(editing.id, form);
      if (form.role === "parent" && selectedParentStudentId) {
        await clearParentLinks(editing.id);
        await apiPost("parent-student-links", {
          parentUserId: editing.id,
          studentId: Number(selectedParentStudentId),
        });
      } else {
        await clearParentLinks(editing.id);
      }
    } else {
      const createdUserId = await addUser(form as Omit<User, "id">);
      if (form.role === "parent" && createdUserId && selectedParentStudentId) {
        await apiPost("parent-student-links", {
          parentUserId: createdUserId,
          studentId: Number(selectedParentStudentId),
        });
      }
    }

    setOpen(false);
    setEditing(null);
    setForm({ active: true });
    setSelectedParentStudentId("");
  };
  const openAdd = () => {
    setEditing(null);
    setForm({ active: true, role: "teacher" });
    setSelectedParentStudentId("");
    setFormErrors({});
    setOpen(true);
  };
  const openEdit = async (u: User) => {
    setEditing(u);
    setForm({ ...u, password: "" });
    if (u.role === "parent") await loadParentLinkedStudent(u.id);
    else setSelectedParentStudentId("");
    setFormErrors({});
    setOpen(true);
  };
  const gridColumns = getColumnsForGrid(selectedGrid);
  const gridLabels: Record<string, string> = {
    students: "Öğrenciler",
    schools: "Okullar",
    lessons: "Dersler",
    lessonStudents: "Ders Öğrencileri",
    attendance: "Yoklama",
    progress: "Gelişim Takibi",
    comments: "Yorumlar",
    reports: "Raporlar",
  };
  const allRoles: UserRole[] = [
    "superadmin",
    "admin",
    "authorized_teacher",
    "teacher",
    "parent",
  ];
  const toggleRole = (col: (typeof gridColumns)[0], role: UserRole) => {
    const hasRole = col.allowedRoles.includes(role);
    const newRoles = hasRole
      ? col.allowedRoles.filter((r) => r !== role)
      : [...col.allowedRoles, role];
    if (newRoles.length > 0)
      updateGridColumnPermission(
        selectedGrid,
        col.columnKey,
        newRoles as UserRole[],
      );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Yetki Yönetimi
        </h2>
      </div>
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "users" ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500"}`}
        >
          Kullanıcılar
        </button>
        <button
          onClick={() => setActiveTab("matrix")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "matrix" ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500"}`}
        >
          Yetki Matrisi
        </button>
        <button
          onClick={() => setActiveTab("teacherLinks")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "teacherLinks" ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500"}`}
        >
          Öğretmen-Ders İlişkisi
        </button>
        <button
          onClick={() => setActiveTab("gridColumns")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "gridColumns" ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500"}`}
        >
          Grid Kolon Yetkileri
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "settings" ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500"}`}
        >
          Sistem Ayarları
        </button>
      </div>

      {activeTab === "users" && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Kullanıcı</TableHead>
                  <TableHead className="text-xs">Ad Soyad</TableHead>
                  <TableHead className="text-xs">Rol</TableHead>
                  <TableHead className="text-xs">E-posta</TableHead>
                  <TableHead className="text-xs">Telefon</TableHead>
                  <TableHead className="text-xs">Durum</TableHead>
                  <TableHead className="text-xs">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow
                    key={u.id}
                    className={u.id === currentUser?.id ? "bg-blue-50" : ""}
                  >
                    <TableCell className="font-medium text-sm flex items-center gap-2">
                      <UserCheck size={16} className="text-gray-400" />
                      {u.username}
                      {u.id === currentUser?.id && (
                        <Badge variant="outline" className="text-[10px]">
                          Siz
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{u.fullName}</TableCell>
                    <TableCell>
                      <Badge
                        className={`${ROLE_COLORS[u.role]} text-white text-xs`}
                      >
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell className="text-sm">{u.phone}</TableCell>
                    <TableCell>
                      <Badge
                        variant={u.active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {u.active ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(u)}
                        >
                          <Pencil size={14} />
                        </Button>
                        {u.id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              if (confirm("Silinsin mi?")) deleteUser(u.id);
                            }}
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === "matrix" && (
        <>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield size={18} /> Yetki Matrisi
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={resetPermissionMatrix}
              className="text-red-500 hover:text-red-700"
            >
              Varsayılana Sıfırla
            </Button>
          </div>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs min-w-[180px]">
                      Yetki
                    </TableHead>
                    {allRoles.map((r) => (
                      <TableHead key={r} className="text-xs text-center w-24">
                        <Badge
                          className={`${ROLE_COLORS[r]} text-white text-[10px]`}
                        >
                          {ROLE_LABELS[r]}
                        </Badge>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissionMatrix.map((entry: PermissionMatrixEntry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs font-medium">
                        {entry.label}
                      </TableCell>
                      {allRoles.map((r) => (
                        <TableCell key={r} className="text-center">
                          <button
                            onClick={() =>
                              updatePermissionMatrixEntry(
                                entry.id,
                                r,
                                !entry[r],
                              )
                            }
                            className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto transition-colors ${entry[r] ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-400"}`}
                          >
                            {entry[r] ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <X size={14} />
                            )}
                          </button>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "teacherLinks" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookMarked size={18} /> Öğretmen-Ders İlişkisi
            </CardTitle>
            <CardDescription>
              Hangi öğretmenin hangi derslere atandığını görün
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Öğretmen</TableHead>
                  <TableHead className="text-xs">Rol</TableHead>
                  <TableHead className="text-xs">Atanmış Dersler</TableHead>
                  <TableHead className="text-xs">Tüm Dersler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users
                  .filter(
                    (u) =>
                      u.role === "teacher" || u.role === "authorized_teacher",
                  )
                  .map((u) => {
                    const assigned = getAssignedLessons(u.id);
                    const assignedLessons = data.lessons.filter((l) =>
                      assigned.includes(l.id),
                    );
                    const allLessons = data.lessons;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-sm">
                          {u.fullName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${ROLE_COLORS[u.role]} text-white text-[10px]`}
                          >
                            {ROLE_LABELS[u.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {assignedLessons.length > 0 ? (
                              assignedLessons.map((l) => (
                                <Badge
                                  key={l.id}
                                  variant="outline"
                                  className="text-[10px] bg-emerald-50 border-emerald-300 text-emerald-700"
                                >
                                  {l.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">
                                Atanmış ders yok
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {allLessons.map((l) => {
                              const isAssigned = assigned.includes(l.id);
                              return (
                                <button
                                  key={l.id}
                                  type="button"
                                  onClick={() => {
                                    if (isAssigned)
                                      unassignLessonFromTeacher(u.id, l.id);
                                    else assignLessonToTeacher(u.id, l.id);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${isAssigned ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"}`}
                                >
                                  {l.name}
                                </button>
                              );
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {users.filter(
                  (u) =>
                    u.role === "teacher" || u.role === "authorized_teacher",
                ).length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-gray-500"
                    >
                      Öğretmen kullanıcısı bulunamadı
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === "gridColumns" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield size={18} /> Grid Kolon Yetkileri
            </CardTitle>
            <CardDescription>
              Her griddeki kolonların hangi rollere görüneceğini yönetin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="w-full sm:w-72">
                <Label className="text-xs mb-1 block">Grid Seçin</Label>
                <Select value={selectedGrid} onValueChange={setSelectedGrid}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(gridLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetGridColumnsToDefaults}
                className="text-red-500 hover:text-red-700"
              >
                Varsayılana Sıfırla
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Kolon</TableHead>
                    {allRoles.map((r) => (
                      <TableHead key={r} className="text-xs text-center">
                        <Badge
                          className={`${ROLE_COLORS[r]} text-white text-[10px]`}
                        >
                          {ROLE_LABELS[r]}
                        </Badge>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gridColumns.map((col) => (
                    <TableRow key={col.columnKey}>
                      <TableCell className="text-sm font-medium">
                        {col.columnLabel}
                      </TableCell>
                      {allRoles.map((r) => (
                        <TableCell key={r} className="text-center">
                          <button
                            onClick={() => toggleRole(col, r)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto transition-colors ${col.allowedRoles.includes(r) ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-400"}`}
                          >
                            {col.allowedRoles.includes(r) ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <X size={14} />
                            )}
                          </button>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {gridColumns.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-gray-500"
                      >
                        Kolon bulunamadı
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "settings" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sistem Ayarları</CardTitle>
              <CardDescription>
                Uygulama genelindeki davranışları yapılandırın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Alt Konu Zorunlu</p>
                  <p className="text-xs text-gray-500">
                    Aktif olursa ders işleme ekranında alt konu seçimi zorunlu olur.
                  </p>
                </div>
                <Switch
                  checked={subTopicRequired}
                  disabled={savingSubTopicSetting}
                  onCheckedChange={async (v) => {
                    setSavingSubTopicSetting(true);
                    try {
                      await apiPut("system-settings/sub_topic_required", {
                        value: String(v),
                      });
                      setSubTopicRequired(v);
                    } catch (err: any) {
                      alert(err?.message || "Ayar kaydedilemedi");
                    } finally {
                      setSavingSubTopicSetting(false);
                    }
                  }}
                />
              </div>

              <div className="p-3 border rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium">Ezber Modu</p>
                  <p className="text-xs text-gray-500">
                    Ezber takip ekranının çalışma modunu seçin.
                  </p>
                </div>
                <Select
                  value={memorizationMode}
                  disabled={savingMemorizationMode}
                  onValueChange={async (v) => {
                    const mode = v as MemorizationMode;
                    setSavingMemorizationMode(true);
                    try {
                      await apiPut("system-settings/memorization_mode", { value: mode });
                      setMemorizationMode(mode);
                    } catch (err: any) {
                      alert(err?.message || "Ayar kaydedilemedi");
                    } finally {
                      setSavingMemorizationMode(false);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ezber modu seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Basit</SelectItem>
                    <SelectItem value="scoring">Puanlamalı</SelectItem>
                    <SelectItem value="detailed">Ayrıntılı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {(memorizationMode === "scoring" || memorizationMode === "detailed") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ezber Değerlendirme Kriterleri</CardTitle>
                <CardDescription>
                  Puanlamalı modda kullanılan kriterleri yönetin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingCriteria(null);
                      setCriteriaForm({ maxScore: 100, weight: 1, active: true, sortOrder: 0 });
                      setCriteriaDialogOpen(true);
                    }}
                  >
                    <Plus size={16} className="mr-1" />
                    Kriter Ekle
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Kod</TableHead>
                        <TableHead className="text-xs">Etiket</TableHead>
                        <TableHead className="text-xs">Maks. Puan</TableHead>
                        <TableHead className="text-xs">Ağırlık</TableHead>
                        <TableHead className="text-xs">Sıra</TableHead>
                        <TableHead className="text-xs">Aktif</TableHead>
                        <TableHead className="text-xs text-right">İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.memorizationCriteria.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-xs">{c.code}</TableCell>
                          <TableCell className="text-xs font-medium">{c.label}</TableCell>
                          <TableCell className="text-xs">{c.maxScore}</TableCell>
                          <TableCell className="text-xs">{c.weight}</TableCell>
                          <TableCell className="text-xs">{c.sortOrder}</TableCell>
                          <TableCell className="text-xs">
                            {c.active ? "Evet" : "Hayır"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingCriteria(c);
                                  setCriteriaForm({ ...c });
                                  setCriteriaDialogOpen(true);
                                }}
                              >
                                <Pencil size={14} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300"
                                onClick={() => {
                                  if (confirm("Kriter silinsin mi?")) {
                                    data.deleteMemorizationCriteria(c.id);
                                  }
                                }}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {data.memorizationCriteria.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-6 text-gray-500 text-xs">
                            Henüz kriter tanımlanmamış.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Kullanıcı Düzenle" : "Yeni Kullanıcı"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Kullanıcı Adı *</Label>
                <Input
                  value={form.username || ""}
                  onChange={(e) => {
                    setForm({ ...form, username: e.target.value });
                    setFormErrors((prev) => ({
                      ...prev,
                      username: undefined,
                    }));
                  }}
                  className={formErrors.username ? "border-red-500" : ""}
                />
                {formErrors.username && (
                  <p className="text-xs text-red-600">
                    {formErrors.username}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ad Soyad *</Label>
                <Input
                  value={form.fullName || ""}
                  onChange={(e) => {
                    setForm({ ...form, fullName: e.target.value });
                    setFormErrors((prev) => ({
                      ...prev,
                      fullName: undefined,
                    }));
                  }}
                  className={formErrors.fullName ? "border-red-500" : ""}
                />
                {formErrors.fullName && (
                  <p className="text-xs text-red-600">
                    {formErrors.fullName}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rol *</Label>
              <Select
                value={form.role || ""}
                onValueChange={(v) => {
                  const nextRole = v as UserRole;
                  setForm({ ...form, role: nextRole });
                  setFormErrors((prev) => ({ ...prev, role: undefined }));
                  if (nextRole !== "parent") {
                    setSelectedParentStudentId("");
                    setFormErrors((prev) => ({
                      ...prev,
                      parentStudentId: undefined,
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.role && (
                <p className="text-xs text-red-600">{formErrors.role}</p>
              )}
            </div>
            {form.role === "parent" && (
              <div className="space-y-1">
                <Label className="text-xs">Öğrenciyi Eşleştir *</Label>
                <Select
                  value={selectedParentStudentId}
                  onValueChange={(v) => {
                    setSelectedParentStudentId(v);
                    setFormErrors((prev) => ({
                      ...prev,
                      parentStudentId: undefined,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Öğrenci seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.students.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.parentStudentId && (
                  <p className="text-xs text-red-600">
                    {formErrors.parentStudentId}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">
                {editing ? "Yeni Şifre (boş=değişmez)" : "Şifre *"}
              </Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={form.password || ""}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                    setFormErrors((prev) => ({
                      ...prev,
                      password: undefined,
                    }));
                  }}
                  className={formErrors.password ? "border-red-500" : ""}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-xs text-red-600">{formErrors.password}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">E-posta</Label>
                <Input
                  value={form.email || ""}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    setFormErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={formErrors.email ? "border-red-500" : ""}
                />
                {formErrors.email && (
                  <p className="text-xs text-red-600">{formErrors.email}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefon</Label>
                <Input
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.active ?? true}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
              <Label className="text-xs">Aktif</Label>
            </div>
            <Button
              onClick={handleSubmit}
              className="w-full"
              disabled={!formValid}
            >
              {editing ? "Güncelle" : "Ekle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={criteriaDialogOpen} onOpenChange={setCriteriaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCriteria ? "Kriter Düzenle" : "Yeni Kriter"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Kod *</Label>
              <Input
                value={criteriaForm.code || ""}
                onChange={(e) => setCriteriaForm({ ...criteriaForm, code: e.target.value })}
                placeholder="tecvid"
                disabled={!!editingCriteria}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Etiket *</Label>
              <Input
                value={criteriaForm.label || ""}
                onChange={(e) => setCriteriaForm({ ...criteriaForm, label: e.target.value })}
                placeholder="Tecvid"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Maks. Puan</Label>
                <Input
                  type="number"
                  min={1}
                  value={criteriaForm.maxScore ?? 100}
                  onChange={(e) => setCriteriaForm({ ...criteriaForm, maxScore: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ağırlık</Label>
                <Input
                  type="number"
                  min={1}
                  value={criteriaForm.weight ?? 1}
                  onChange={(e) => setCriteriaForm({ ...criteriaForm, weight: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sıra</Label>
                <Input
                  type="number"
                  value={criteriaForm.sortOrder ?? 0}
                  onChange={(e) => setCriteriaForm({ ...criteriaForm, sortOrder: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={criteriaForm.active ?? true}
                onCheckedChange={(v) => setCriteriaForm({ ...criteriaForm, active: v })}
              />
              <Label className="text-xs">Aktif</Label>
            </div>
            <Button
              className="w-full"
              disabled={!criteriaForm.code?.trim() || !criteriaForm.label?.trim()}
              onClick={() => {
                const payload = {
                  code: criteriaForm.code!.trim(),
                  label: criteriaForm.label!.trim(),
                  maxScore: criteriaForm.maxScore ?? 100,
                  weight: criteriaForm.weight ?? 1,
                  sortOrder: criteriaForm.sortOrder ?? 0,
                  active: criteriaForm.active ?? true,
                };
                if (editingCriteria) {
                  data.updateMemorizationCriteria(editingCriteria.id, payload);
                } else {
                  data.addMemorizationCriteria(payload);
                }
                setCriteriaDialogOpen(false);
              }}
            >
              {editingCriteria ? "Güncelle" : "Ekle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
