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

// ====== STUDENT FORM PAGE ======
export function StudentFormPage() {
  const data = useStudentData();
  const { canViewTC, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = !!id;
  const stateStudent = location.state?.student as Student | undefined;
  const student = isEdit
    ? data.students.find((s) => s.id === Number(id)) ||
      (stateStudent?.id === Number(id) ? stateStudent : null)
    : null;

  // Tüm hook'lar conditional return'dan ONCE cagrilmali
  const [activeTab, setActiveTab] = useState<"info" | "survey">("info");
  const [surveyAnswers, setSurveyAnswers] = useState<Record<number, string>>(
    {},
  );
  const [error, setError] = useState("");

  useEffect(() => {
    data.loadStudents();
    data.loadSchools();
    data.loadClassRooms();
    data.loadLessons();
    data.loadSurveys();
    data.loadSurveyQuestions();
    data.loadSurveyAnswers();
  }, []);
  /*
  if (data.loadingStudents || data.loadingSchools || data.loadingClassRooms || data.loadingLessons || data.loadingSurveys || data.loadingSurveyQuestions || data.loadingSurveyAnswers) {
    return <Loading />;
  }
*/
  const currentYear = new Date().getFullYear();

  const isSuperadmin = currentUser?.role === "superadmin";
  const isSchoolScoped =
    currentUser?.role === "admin" || currentUser?.role === "authorized_teacher";

  const defaultSchool = useMemo(() => {
    if (isEdit && student) {
      const name =
        student.schoolName ||
        data.schools.find((s) => s.id === student.schoolId)?.name ||
        "";
      return { id: student.schoolId, name };
    }
    if (isSchoolScoped && currentUser?.schoolId) {
      const name =
        data.schools.find((s) => s.id === currentUser.schoolId)?.name || "";
      return { id: currentUser.schoolId, name };
    }
    return { id: undefined as number | undefined, name: "" };
  }, [isEdit, student, currentUser, data.schools, isSchoolScoped]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    let body = digits;
    if (body.startsWith("05")) {
      body = body.slice(2);
    }
    body = body.slice(0, 9);
    return "05" + body;
  };

  const [form, setForm] = useState({
    tcKimlik: student?.tcKimlik || "",
    firstName: student?.firstName || "",
    lastName: student?.lastName || "",
    birthYear: student?.birthYear || (undefined as number | undefined),
    city: student?.city || "",
    schoolId: defaultSchool.id,
    schoolName: defaultSchool.name,
    grade: student?.grade || "",
    phone: formatPhone(student?.phone || ""),
    parentName: student?.parentName || "",
    parentPhone: formatPhone(student?.parentPhone || ""),
    email: student?.email || "",
    lessons: student?.lessons || ([] as number[]),
    groupId: student?.groupId || (undefined as number | undefined),
  });

  const computedAge = form.birthYear ? currentYear - form.birthYear : undefined;

  // Düzenleme modunda ogrenci verisi geldiginde formu ve anket cevaplarini doldur
  // School-scoped users start with their own school once schools are loaded.
  useEffect(() => {
    if (!isEdit && isSchoolScoped && defaultSchool.id && !form.schoolId) {
      setForm((f) => ({
        ...f,
        schoolId: defaultSchool.id,
        schoolName: defaultSchool.name,
      }));
    }
  }, [isEdit, isSchoolScoped, defaultSchool.id, defaultSchool.name, form.schoolId]);

  const availableCourses = useMemo(() => {
    if (!isSuperadmin) return data.lessons;
    if (!form.schoolId) return [];
    return data.lessons.filter((l) => l.schoolId === form.schoolId);
  }, [isSuperadmin, form.schoolId, data.lessons]);

  useEffect(() => {
    if (isEdit && student) {
      const resolvedSchoolName =
        student.schoolName ||
        data.schools.find((s) => s.id === student.schoolId)?.name ||
        "";

      setForm({
        tcKimlik: student.tcKimlik || "",
        firstName: student.firstName || "",
        lastName: student.lastName || "",
        birthYear: student.birthYear || undefined,
        city: student.city || "",
        schoolId: student.schoolId,
        schoolName: resolvedSchoolName,
        grade: student.grade || "",
        phone: formatPhone(student.phone || ""),
        parentName: student.parentName || "",
        parentPhone: formatPhone(student.parentPhone || ""),
        email: student.email || "",
        lessons: student.lessons || [],
        groupId: student.groupId || undefined,
      });
      // Anket cevaplarini localStorage'dan dogrudan oku (useStudentData instance farkliligi icin)
      try {
        const allAnswers: SurveyAnswer[] = JSON.parse(
          localStorage.getItem("ots_surveyAnswers") || "[]",
        );
        const existing: Record<number, string> = {};
        allAnswers
          .filter((a) => a.studentId === student.id)
          .forEach((a) => {
            existing[a.questionId] = a.answer;
          });
        setSurveyAnswers(existing);
      } catch {
        setSurveyAnswers({});
      }
    }
  }, [
    isEdit,
    id,
    student?.id,
    student?.schoolName,
    student?.schoolId,
    data.schools,
  ]);

  // Conditional return hook'larin TUMUNDEN SONRA olmali
  if (isEdit && !student) return <Navigate to="/students" replace />;

  const saveSurveyAnswers = (studentId: number) => {
    // Mevcut cevapları sil
    data.surveyAnswers
      .filter((a) => a.studentId === studentId)
      .forEach((a) => data.deleteSurveyAnswer(a.id));
    // Yeni cevapları kaydet
    Object.entries(surveyAnswers).forEach(([questionId, answer]) => {
      if (answer.trim()) {
        const question = data.surveyQuestions.find(
          (q) => q.id === Number(questionId),
        );
        if (question) {
          data.addSurveyAnswer({
            studentId,
            surveyId: question.surveyId,
            questionId: Number(questionId),
            answer,
          });
        }
      }
    });
  };

  const handleSubmit = () => {
    // Validation
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Ad ve soyad zorunludur");
      return;
    }
    if (!form.birthYear || form.birthYear <= 0 || isNaN(form.birthYear)) {
      setError("Geçerli bir doğum yılı girin");
      return;
    }
    if (!form.grade.trim()) {
      setError("Grup/Sınıf zorunludur");
      return;
    }
    if (!form.schoolName.trim()) {
      setError("Okul adı zorunludur");
      return;
    }

    setError("");
    const autoAge = currentYear - Number(form.birthYear);

    let schoolId: number | undefined;
    let schoolName = form.schoolName.trim();

    if (isSchoolScoped) {
      if (!currentUser?.schoolId) {
        setError("Hesabınıza medrese atanmamış");
        return;
      }
      schoolId = currentUser.schoolId;
      schoolName =
        data.schools.find((s) => s.id === currentUser.schoolId)?.name ||
        schoolName;
    } else {
      // Superadmin: mevcut okullardan seçmeli
      schoolId = form.schoolId;
      if (!schoolId) {
        setError("Lütfen bir medrese seçin");
        return;
      }
      schoolName =
        data.schools.find((s) => s.id === schoolId)?.name || schoolName;
    }

    if (!schoolId) {
      setError("Medrese bilgisi belirlenemedi");
      return;
    }

    const p = {
      ...form,
      age: autoAge,
      birthYear: Number(form.birthYear),
      schoolId: Number(schoolId),
      schoolName,
      groupId: form.groupId || undefined,
    };
    try {
      if (isEdit && student) {
        data.updateStudent(student.id, p);
        saveSurveyAnswers(student.id);
      } else {
        const newStudent = data.addStudent(p);
        saveSurveyAnswers(newStudent.id);
      }
      navigate("/students");
    } catch (err) {
      setError("Kayıt sırasında bir hata oluştu");
    }
  };

  const toggleLesson = (lid: number) =>
    setForm((f) => ({
      ...f,
      lessons: f.lessons.includes(lid)
        ? f.lessons.filter((l) => l !== lid)
        : [...f.lessons, lid],
    }));

  const handleSurveyAnswerChange = (questionId: number, value: string) => {
    setSurveyAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/students")}
        >
          <ArrowLeft size={18} />
        </Button>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          {isEdit ? "Düzenle" : "Yeni Öğrenci"}
        </h2>
      </div>
      {/* Tab bar her zaman göster: hem ekleme hem düzenleme */}
      <div className="flex border-b bg-white rounded-t-lg px-4 pt-2">
        <button
          onClick={() => setActiveTab("info")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "info" ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500"}`}
        >
          <Users size={16} className="inline mr-1" />
          Öğrenci Bilgileri
        </button>
        <button
          onClick={() => setActiveTab("survey")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "survey" ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500"}`}
        >
          <ClipboardList size={16} className="inline mr-1" />
          Anket / Gelişim
        </button>
      </div>
      {activeTab === "info" && (
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-4">
            {canViewTC && (
              <div className="space-y-1">
                <Label className="text-xs">TC Kimlik No</Label>
                <Input
                  value={form.tcKimlik}
                  onChange={(e) =>
                    setForm({ ...form, tcKimlik: e.target.value })
                  }
                  placeholder="11111111111"
                  maxLength={11}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Ad *</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Soyad *</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Doğum Yılı *</Label>
                <Input
                  type="number"
                  value={form.birthYear || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({
                      ...form,
                      birthYear: val ? parseInt(val) : undefined,
                    });
                  }}
                  placeholder="örn: 2013"
                  min="1900"
                  max={currentYear}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Yaş (Otomatik)</Label>
                <Input
                  type="number"
                  value={computedAge || ""}
                  disabled
                  className="bg-gray-100 text-gray-600"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Memleket</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Sınıf *</Label>
                <Input
                  type="number"
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  placeholder="örn: 6"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Medrese *</Label>
                {isSuperadmin ? (
                  <Select
                    value={form.schoolId ? String(form.schoolId) : ""}
                    onValueChange={(v) => {
                      const id = Number(v);
                      const name =
                        data.schools.find((s) => s.id === id)?.name || "";
                      setForm((f) => ({
                        ...f,
                        schoolId: id,
                        schoolName: name,
                        // Seçilen medrese değişince kurs seçimini sıfırla
                        lessons: isEdit ? f.lessons : [],
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Medrese seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.schools.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.schoolName}
                    disabled
                    placeholder="Medrese adı"
                  />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Grup</Label>
              <Select
                value={form.groupId ? String(form.groupId) : "none"}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    groupId: v === "none" ? undefined : Number(v),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Grup seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Grup Yok</SelectItem>
                  {data.classRooms
                    .filter((c) => c.active)
                    .map((cr) => (
                      <SelectItem key={cr.id} value={String(cr.id)}>
                        {cr.name} ({cr.grade})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Öğrenci Tel</Label>
                <Input
                  value={form.phone}
                  placeholder="05XXXXXXXXX"
                  type="tel"
                  maxLength={11}
                  onChange={(e) =>
                    setForm({ ...form, phone: formatPhone(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">E-posta</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Veli Adı</Label>
              <Input
                value={form.parentName}
                onChange={(e) =>
                  setForm({ ...form, parentName: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Veli Telefon</Label>
              <Input
                value={form.parentPhone}
                placeholder="05XXXXXXXXX"
                type="tel"
                maxLength={11}
                onChange={(e) =>
                  setForm({ ...form, parentPhone: formatPhone(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kurslar</Label>
              {isSuperadmin && !form.schoolId ? (
                <p className="text-xs text-gray-500">
                  Kurs atamak için önce bir medrese seçin.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableCourses.map((l) => (
                    <Button
                      key={l.id}
                      type="button"
                      size="sm"
                      variant={
                        form.lessons.includes(l.id) ? "default" : "outline"
                      }
                      onClick={() => toggleLesson(l.id)}
                    >
                      {l.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSubmit} className="flex-1">
                {isEdit ? "Güncelle" : "Ekle"}
              </Button>
              <Button variant="outline" onClick={() => navigate("/students")}>
                İptal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {activeTab === "survey" && (
        <>
          <StudentSurveyTab
            data={data}
            answers={surveyAnswers}
            onAnswersChange={handleSurveyAnswerChange}
          />
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSubmit} className="flex-1">
              {isEdit ? "Güncelle" : "Ekle"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/students")}>
              İptal
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ====== STUDENT FORM - SURVEY TAB ======
export function StudentSurveyTab({
  data,
  answers,
  onAnswersChange,
}: {
  data: ReturnType<typeof useStudentData>;
  answers: Record<number, string>;
  onAnswersChange: (questionId: number, value: string) => void;
}) {
  const activeSurveys = data.surveys.filter((s) => s.active);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "text":
        return <AlignLeft size={14} />;
      case "select":
        return <CircleDot size={14} />;
      case "multiselect":
        return <CheckSquare size={14} />;
      case "test":
        return <ListChecks size={14} />;
    }
  };

  if (activeSurveys.length === 0)
    return (
      <p className="text-center text-gray-500 py-8">
        Henüz anket bulunmamaktadır. Anket Yönetimi menüsünden anket
        ekleyebilirsiniz.
      </p>
    );

  return (
    <div className="space-y-6">
      {activeSurveys.map((survey) => {
        const questions = data.getSurveyQuestions(survey.id);
        if (questions.length === 0) return null;
        return (
          <Card key={survey.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <ClipboardList size={18} className="text-emerald-600" />
                <CardTitle className="text-base">{survey.title}</CardTitle>
              </div>
              {survey.description && (
                <CardDescription className="text-xs">
                  {survey.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((q) => (
                <div key={q.id} className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getTypeIcon(q.type)}
                    <Label className="text-sm font-medium">
                      {q.questionText}
                    </Label>
                    <Badge variant="outline" className="text-[10px]">
                      {q.type === "text"
                        ? "Metin"
                        : q.type === "select"
                          ? "Tek Seçim"
                          : q.type === "multiselect"
                            ? "Çok Seçim"
                            : "Test"}
                    </Badge>
                  </div>
                  {q.type === "text" && (
                    <Textarea
                      value={answers[q.id] || ""}
                      onChange={(e) => onAnswersChange(q.id, e.target.value)}
                      placeholder="Cevabınızı yazın..."
                      rows={2}
                    />
                  )}
                  {q.type === "select" && (
                    <Select
                      value={answers[q.id] || ""}
                      onValueChange={(v) => onAnswersChange(q.id, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {q.options.map((o: string, i: number) => (
                          <SelectItem key={i} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {q.type === "multiselect" && (
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((o: string, i: number) => (
                        <Button
                          key={i}
                          type="button"
                          size="sm"
                          variant={
                            (answers[q.id] || "").includes(o)
                              ? "default"
                              : "outline"
                          }
                          onClick={() => {
                            const current = (answers[q.id] || "")
                              .split(", ")
                              .filter(Boolean);
                            const updated = current.includes(o)
                              ? current.filter((v) => v !== o)
                              : [...current, o];
                            onAnswersChange(q.id, updated.join(", "));
                          }}
                        >
                          {o}
                        </Button>
                      ))}
                    </div>
                  )}
                  {q.type === "test" && (
                    <div className="flex gap-2">
                      {q.options.map((o: string, i: number) => (
                        <Button
                          key={i}
                          type="button"
                          size="sm"
                          variant={answers[q.id] === o ? "default" : "outline"}
                          onClick={() => onAnswersChange(q.id, o)}
                        >
                          {o}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
