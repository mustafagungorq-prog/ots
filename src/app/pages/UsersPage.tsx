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
  ChevronsUpDown,
  Check,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { apiPost, apiDelete } from "@/hooks/useApi";
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

// ====== USERS PAGE ======
export function UsersPage() {
  const data = useStudentData();
  const {
    users,
    changePassword,
    currentUser,
    addUser,
    updateUser,
    usersLoaded,
    refreshUsers,
    canManageUser,
  } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPass, setNewPass] = useState("");
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [formErrors, setFormErrors] = useState<UserFormErrors>({});
  const [userForm, setUserForm] = useState<Partial<User>>({
    active: true,
    role: "teacher",
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedParentStudentId, setSelectedParentStudentId] =
    useState<string>("");
  const [activeTab, setActiveTab] = useState<"users" | "parents">("users");
  const userFormValid = useMemo(() => {
    const { valid } = validateUserForm(
      userForm,
      selectedParentStudentId,
      users,
      editingUser?.id,
    );
    return valid;
  }, [userForm, selectedParentStudentId, users, editingUser]);

  useEffect(() => {
    data.loadStudents();
    data.loadParentStudentLinks();
    refreshUsers();
  }, []);
  /*
    if (data.loadingStudents || !usersLoaded) {
      return <Loading />;
    }*/

  const getDisplayName = (u: any) =>
    u?.fullName || u?.full_name || u?.username || "-";
  const handleChangePassword = () => {
    if (!selectedUser || !newPass) return;
    changePassword(selectedUser.id, newPass);
    setOpen(false);
    setSelectedUser(null);
    setNewPass("");
  };
  const handleSaveUser = async () => {
    const { valid, errors } = validateUserForm(
      userForm,
      selectedParentStudentId,
      users,
      editingUser?.id,
    );
    if (!valid) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    if (editingUser) {
      const payload = { ...userForm };
      if (!payload.password) {
        delete payload.password;
      }
      await updateUser(editingUser.id, payload);

      const existingStudentIds = data.parentStudentLinks
        .filter((l) => l.parentUserId === editingUser.id)
        .map((l) => l.studentId);

      if (
        userForm.role === "parent" &&
        selectedParentStudentId
      ) {
        for (const sid of existingStudentIds) {
          await apiDelete(
            `parent-student-links?parentUserId=${editingUser.id}&studentId=${sid}`,
          );
        }
        await apiPost("parent-student-links", {
          parentUserId: editingUser.id,
          studentId: Number(selectedParentStudentId),
        });
      } else if (userForm.role !== "parent") {
        for (const sid of existingStudentIds) {
          await apiDelete(
            `parent-student-links?parentUserId=${editingUser.id}&studentId=${sid}`,
          );
        }
      }
    } else {
      const createdUserId = await addUser(userForm as Omit<User, "id">);
      if (
        userForm.role === "parent" &&
        createdUserId &&
        selectedParentStudentId
      ) {
        await apiPost("parent-student-links", {
          parentUserId: createdUserId,
          studentId: Number(selectedParentStudentId),
        });
      }
    }

    await data.loadParentStudentLinks(true);
    setUserFormOpen(false);
    setShowPw(false);
    setUserForm({ active: true, role: "teacher" });
    setSelectedParentStudentId("");
    setEditingUser(null);
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Kullanıcılar
        </h2>
        {canManageUser && (
          <Button
            onClick={() => {
              setEditingUser(null);
              setUserForm({ active: true, role: "teacher" });
              setSelectedParentStudentId("");
              setFormErrors({});
              setUserFormOpen(true);
            }}
          >
            <Plus size={18} className="mr-1" /> Kullanıcı Ekle
          </Button>
        )}
      </div>
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "users" ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Kullanıcılar
        </button>
        <button
          onClick={() => setActiveTab("parents")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "parents" ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Veliler
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
                  <TableHead className="text-xs">Medrese</TableHead>
                  <TableHead className="text-xs">E-posta</TableHead>
                  <TableHead className="text-xs">Telefon</TableHead>
                  <TableHead className="text-xs">Durum</TableHead>
                  <TableHead className="text-xs">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users
                  .filter((u) => u.role !== "parent")
                  .map((u) => (
                    <TableRow
                      key={u.id}
                      className={u.id === currentUser?.id ? "bg-blue-50" : ""}
                    >
                      <TableCell className="font-medium text-sm">
                        {u.username}
                        {u.id === currentUser?.id && (
                          <Badge variant="outline" className="text-[10px] ml-1">
                            Siz
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getDisplayName(u)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${ROLE_COLORS[u.role]} text-white text-xs`}
                        >
                          {ROLE_LABELS[u.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {data.schools.find((s) => s.id === u.schoolId)?.name ||
                          "-"}
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
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(u);
                              setOpen(true);
                            }}
                          >
                            <Shield size={14} className="mr-1" /> Şifre
                            Değiştir
                          </Button>
                          {canManageUser && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingUser(u);
                                setUserForm({
                                  username: u.username,
                                  fullName: u.fullName,
                                  email: u.email,
                                  phone: u.phone,
                                  role: u.role,
                                  schoolId: u.schoolId ?? null,
                                  active: u.active,
                                });
                                setSelectedParentStudentId("");
                                setFormErrors({});
                                setUserFormOpen(true);
                              }}
                            >
                              <Pencil size={14} className="mr-1" /> Düzenle
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

      {activeTab === "parents" && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Kullanıcı</TableHead>
                  <TableHead className="text-xs">Ad Soyad</TableHead>
                  <TableHead className="text-xs">E-posta</TableHead>
                  <TableHead className="text-xs">Telefon</TableHead>
                  <TableHead className="text-xs">Öğrenci</TableHead>
                  <TableHead className="text-xs">Durum</TableHead>
                  <TableHead className="text-xs">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users
                  .filter((u) => u.role === "parent")
                  .map((u) => {
                    const link = data.parentStudentLinks.find(
                      (l) => l.parentUserId === u.id,
                    );
                    const student = link
                      ? data.students.find((s) => s.id === link.studentId)
                      : null;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-sm">
                          {u.username}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getDisplayName(u)}
                        </TableCell>
                        <TableCell className="text-sm">{u.email}</TableCell>
                        <TableCell className="text-sm">{u.phone}</TableCell>
                        <TableCell className="text-sm">
                          {student ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-emerald-300 text-emerald-700"
                            >
                              {student.firstName} {student.lastName}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={u.active ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {u.active ? "Aktif" : "Pasif"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(u);
                                setOpen(true);
                              }}
                            >
                              <Shield size={14} className="mr-1" /> Şifre
                              Değiştir
                            </Button>
                            {canManageUser && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingUser(u);
                                  setUserForm({
                                    username: u.username,
                                    fullName: u.fullName,
                                    email: u.email,
                                    phone: u.phone,
                                    role: u.role,
                                    schoolId: u.schoolId ?? null,
                                    active: u.active,
                                  });
                                  setSelectedParentStudentId(
                                    String(link?.studentId ?? ""),
                                  );
                                  setFormErrors({});
                                  setUserFormOpen(true);
                                }}
                              >
                                <Pencil size={14} className="mr-1" /> Düzenle
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Şifre Değiştir -{" "}
              {selectedUser ? getDisplayName(selectedUser) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <div className="space-y-1">
              <Label className="text-xs">Yeni Şifre</Label>
              <Input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
            </div>
            <Button onClick={handleChangePassword} className="w-full">
              Değiştir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={userFormOpen} onOpenChange={setUserFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Kullanıcı Düzenle" : "Yeni Kullanıcı"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Kullanıcı Adı *</Label>
                <Input
                  value={userForm.username || ""}
                  onChange={(e) => {
                    setUserForm({ ...userForm, username: e.target.value });
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
                  value={userForm.fullName || ""}
                  onChange={(e) => {
                    setUserForm({ ...userForm, fullName: e.target.value });
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
                value={userForm.role || "teacher"}
                onValueChange={(v) => {
                  const nextRole = v as UserRole;
                  setUserForm({ ...userForm, role: nextRole });
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
                  {Object.entries(ROLE_LABELS)
                    .filter(
                      ([k]) =>
                        currentUser?.role === "superadmin" || k !== "superadmin",
                    )
                    .map(([k, v]) => (
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
            {currentUser?.role === "superadmin" && (
              <div className="space-y-1">
                <Label className="text-xs">Medrese</Label>
                <Select
                  value={userForm.schoolId ? String(userForm.schoolId) : "none"}
                  onValueChange={(v) =>
                    setUserForm({
                      ...userForm,
                      schoolId: v === "none" ? null : Number(v),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Medrese seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Medrese seçilmedi</SelectItem>
                    {data.schools.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(currentUser?.role === "admin" ||
              currentUser?.role === "authorized_teacher") && (
              <div className="space-y-1">
                <Label className="text-xs">Medrese</Label>
                <Input
                  value={
                    data.schools.find((s) => s.id === currentUser.schoolId)
                      ?.name || "-"
                  }
                  disabled
                />
              </div>
            )}
            {userForm.role === "parent" && (
              <div className="space-y-1">
                <Label className="text-xs">Öğrenciyi Eşleştir *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-9 text-sm font-normal"
                    >
                      {selectedParentStudentId
                        ? (() => {
                            const s = data.students.find(
                              (x) =>
                                String(x.id) === selectedParentStudentId,
                            );
                            return s
                              ? `${s.firstName} ${s.lastName}`
                              : "Öğrenci seçin";
                          })()
                        : "Öğrenci seçin"}
                      <ChevronsUpDown
                        size={14}
                        className="ml-2 opacity-50 shrink-0"
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0"
                    style={{ width: "var(--radix-popover-trigger-width)" }}
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Öğrenci ara..." />
                      <CommandList>
                        <CommandEmpty>Öğrenci bulunamadı</CommandEmpty>
                        <CommandGroup>
                          {data.students.map((s) => (
                            <CommandItem
                              key={s.id}
                              value={`${s.firstName} ${s.lastName} ${s.grade}`}
                              onSelect={() => {
                                setSelectedParentStudentId(String(s.id));
                                setFormErrors((prev) => ({
                                  ...prev,
                                  parentStudentId: undefined,
                                }));
                              }}
                            >
                              <Check
                                size={14}
                                className={`mr-2 shrink-0 ${String(s.id) === selectedParentStudentId ? "opacity-100" : "opacity-0"}`}
                              />
                              {s.firstName} {s.lastName} ({s.grade})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {formErrors.parentStudentId && (
                  <p className="text-xs text-red-600">
                    {formErrors.parentStudentId}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">
                Şifre {editingUser ? "(değiştirmek için girin)" : "*"}
              </Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={userForm.password || ""}
                  onChange={(e) => {
                    setUserForm({ ...userForm, password: e.target.value });
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
                  value={userForm.email || ""}
                  onChange={(e) => {
                    setUserForm({ ...userForm, email: e.target.value });
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
                  value={userForm.phone || ""}
                  onChange={(e) =>
                    setUserForm({ ...userForm, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={userForm.active ?? true}
                onCheckedChange={(v) =>
                  setUserForm({ ...userForm, active: v })
                }
              />
              <Label className="text-xs">Aktif</Label>
            </div>
            <Button
              onClick={handleSaveUser}
              className="w-full"
              disabled={!userFormValid}
            >
              Ekle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
