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
import { sendMailViaPhp } from "@/hooks/useApi";
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

// ====== PROGRESS PAGE ======
export function ProgressPage() {
  const data = useStudentData();
  const navigate = useNavigate();
  const {
    canViewColumn,
    currentUser,
    teacherLessons,
    canEdit,
    teacherLessonsLoaded,
    refreshTeacherLessons,
  } = useAuth();

  useEffect(() => {
    data.loadStudents();
    data.loadClassRooms();
    data.loadLessons();
    data.loadSchools();
    data.loadProgress();
    data.loadAttendance();
    data.loadHomeworkTemplates();
    data.loadCurriculumTopics();
    refreshTeacherLessons();
  }, []);

  const isTeacher =
    currentUser?.role === "teacher" ||
    currentUser?.role === "authorized_teacher";
  // Ogretmenin atanmis dersleri - dogrudan teacherLessons state'inden oku
  const myLessonIds =
    isTeacher && currentUser
      ? teacherLessons
          .filter((a) => a.teacherId === currentUser.id)
          .map((a) => a.lessonId)
      : [];
  // Ogretmenin atanmis gruplari
  const myGroupIds =
    isTeacher && currentUser
      ? data.classRooms
          .filter((r) => r.teacherIds.includes(currentUser.id))
          .map((r) => r.id)
      : [];
  const myStudents =
    isTeacher && currentUser
      ? (() => {
          // Derse atanmis ogrenciler
          const lessonStudents =
            myLessonIds.length > 0
              ? data.students.filter((s) =>
                  s.lessons.some((lid: number) => myLessonIds.includes(lid)),
                )
              : [];
          // Grupla atanmis ogrenciler
          const groupStudents =
            myGroupIds.length > 0
              ? data.students.filter((s) =>
                  myGroupIds.includes(s.groupId || -1),
                )
              : [];
          // Birlestir, tekrarlari kaldir
          const combined = [...lessonStudents, ...groupStudents];
          const unique = combined.filter(
            (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i,
          );
          return unique;
        })()
      : data.students;

  const [activeView, setActiveView] = useState<"summary" | "bulk" | "records">(
    "bulk",
  );
  const [summarySearch, setSummarySearch] = useState("");
  const [bulkSearch, setBulkSearch] = useState("");

  useEffect(() => {
    setSummarySearch("");
    setBulkSearch("");
  }, [activeView]);

  const [selLesson, setSelLesson] = useState("");
  const [progDate, setProgDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [saved, setSaved] = useState(false);

  // Toplu giriş state'i: ogrenciId -> { kuranPages, kuranCurrent, risalePages, ... }
  const [bulkData, setBulkData] = useState<
    Record<
      number,
      {
        kp: string;
        kc: string;
        rp: string;
        rc: string;
        ec: string;
        note: string;
      }
    >
  >({});

  // Filtre state'leri
  const [summaryFilterGroup, setSummaryFilterGroup] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterSchool, setFilterSchool] = useState<string>("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [filterAgeMin, setFilterAgeMin] = useState<string>("");
  const [filterAgeMax, setFilterAgeMax] = useState<string>("");

  // Coklu ogrenci secimi + toplu odev (homework template tabanli)
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [homeworkOpen, setHomeworkOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [customContent, setCustomContent] = useState("");
  const [customDetails, setCustomDetails] = useState("");
  const selectedTemplate = data.homeworkTemplates.find(
    (t) => String(t.id) === selectedTemplateId,
  );

  // Coklu ogrenci secimi + toplu ders isleme
  const [lessonLogOpen, setLessonLogOpen] = useState(false);
  const [selectedLessonCategory, setSelectedLessonCategory] = useState<
    "ilmihal" | "adab" | "tecvid" | "diger" | ""
  >("");
  const [selectedLessonTopicId, setSelectedLessonTopicId] =
    useState<string>("");
  const [selectedLessonSubTopic, setSelectedLessonSubTopic] =
    useState<string>("");
  const [lessonLogNotes, setLessonLogNotes] = useState("");
  const selectedTopic = data.curriculumTopics.find(
    (t) => String(t.id) === selectedLessonTopicId,
  );
  const filteredTopics = selectedLessonCategory
    ? data.curriculumTopics.filter((t) => t.category === selectedLessonCategory)
    : [];

  const lastProg = (sid: number) => {
    const l = data.progress.filter((p) => p.studentId === sid);
    return l[l.length - 1];
  };

  const selectedLessonId =
    selLesson && selLesson !== "all" ? Number(selLesson) : null;
  const summaryStudents = myStudents
    .filter((s) => {
      if (summaryFilterGroup === "all") return true;
      const group = data.classRooms.find(
        (c) => String(c.id) === summaryFilterGroup,
      );
      if (!group) return false;
      const hasGroupMatch = s.groupId === Number(summaryFilterGroup);
      const hasGradeSchoolMatch =
        !s.groupId && s.schoolId === group.schoolId && s.grade === group.grade;
      return hasGroupMatch || hasGradeSchoolMatch;
    })
    .filter((s) =>
      `${s.firstName} ${s.lastName}`
        .toLowerCase()
        .includes(summarySearch.toLowerCase()),
    )
    .sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`,
        "tr",
      ),
    );

  const summaryGroupOptions = useMemo(() => {
    return data.classRooms
      .filter((c) => c.active)
      .filter((c) =>
        myStudents.some(
          (s) =>
            s.groupId === c.id ||
            (!s.groupId && s.schoolId === c.schoolId && s.grade === c.grade),
        ),
      );
  }, [data.classRooms, myStudents]);

  const studentsToShow = myStudents
    .filter((s) => {
      if (selectedLessonId && !s.lessons.includes(selectedLessonId))
        return false;
      if (filterGroup !== "all") {
        const group = data.classRooms.find((c) => String(c.id) === filterGroup);
        if (group) {
          const hasGroupMatch = s.groupId === Number(filterGroup);
          const hasGradeSchoolMatch =
            !s.groupId &&
            s.schoolId === group.schoolId &&
            s.grade === group.grade;
          if (!hasGroupMatch && !hasGradeSchoolMatch) return false;
        }
      }
      if (filterSchool !== "all" && String(s.schoolId) !== filterSchool)
        return false;
      if (filterGrade !== "all" && s.grade !== filterGrade) return false;
      if (filterAgeMin && s.age < Number(filterAgeMin)) return false;
      if (filterAgeMax && s.age > Number(filterAgeMax)) return false;
      return true;
    })
    .filter((s) =>
      `${s.firstName} ${s.lastName}`
        .toLowerCase()
        .includes(bulkSearch.toLowerCase()),
    )
    .sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`,
        "tr",
      ),
    );

  // Filtre secenekleri
  const gradeOptions = useMemo(
    () => Array.from(new Set(data.students.map((s) => s.grade))).sort(),
    [data.students],
  );
  const activeFiltersCount = [
    filterGroup !== "all",
    filterSchool !== "all",
    filterGrade !== "all",
    filterAgeMin,
    filterAgeMax,
    selLesson,
  ].filter(Boolean).length;

  const updateBulk = (sid: number, field: string, value: string) => {
    setBulkData((prev) => ({
      ...prev,
      [sid]: { ...prev[sid], [field]: value },
    }));
    setSaved(false);
  };

  const toggleStudentSelection = (sid: number) => {
    setSelectedStudents((prev) =>
      prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid],
    );
  };
  const selectAllStudents = () => {
    setSelectedStudents(studentsToShow.map((s) => s.id));
  };
  const deselectAllStudents = () => {
    setSelectedStudents([]);
  };

  const handleSaveHomework = () => {
    if (selectedStudents.length === 0) return;
    const isCustom = selectedTemplateId === "custom";
    const isTemplate = !!selectedTemplate;
    if (!isCustom && !isTemplate) {
      alert("Lütfen bir ödev seçin veya Diğer seçeneğini kullanın");
      return;
    }
    if (isCustom && (!customTitle.trim() || !customContent.trim())) {
      alert("Lütfen ödev başlığı ve içeriğini girin");
      return;
    }

    const title = isTemplate ? selectedTemplate!.title : customTitle;
    const content = isTemplate ? selectedTemplate!.content : customContent;
    const type = isTemplate ? selectedTemplate!.type : "diger";
    const details = isTemplate ? selectedTemplate!.details : customDetails;

    if (
      !confirm(
        `${selectedStudents.length} öğrenciye "${title}" ödevi atanacak. Emin misiniz?`,
      )
    )
      return;
    selectedStudents.forEach((sid) => {
      data.addHomeworkAssignment({
        studentId: sid,
        type,
        title,
        content,
        details,
        author: currentUser?.fullName || currentUser?.username || "Öğretmen",
        completed: false,
      });
    });
    setHomeworkOpen(false);
    setSelectedTemplateId("");
    setCustomTitle("");
    setCustomContent("");
    setCustomDetails("");
    setSelectedStudents([]);
    alert(`${selectedStudents.length} öğrenciye ödev atandı`);
  };

  const handleSaveLessonLog = () => {
    if (selectedStudents.length === 0) return;
    if (!selectedLessonCategory) {
      alert("Lütfen bir kategori seçin (İlmihal / Adab / Tecvid)");
      return;
    }
    if (!selectedLessonTopicId) {
      alert("Lütfen bir konu seçin");
      return;
    }
    if (!selectedLessonSubTopic) {
      alert("Lütfen bir alt konu seçin");
      return;
    }
    const topic = data.curriculumTopics.find(
      (t) => String(t.id) === selectedLessonTopicId,
    );
    if (
      !confirm(
        `${selectedStudents.length} öğrenciye "${topic?.title} → ${selectedLessonSubTopic}" ders işlemesi kaydedilecek. Emin misiniz?`,
      )
    )
      return;
    selectedStudents.forEach((sid) => {
      data.addLessonLog({
        studentId: sid,
        date: progDate,
        category: selectedLessonCategory as "ilmihal" | "adab" | "tecvid",
        topic: topic?.title || "",
        subTopic: selectedLessonSubTopic,
        notes: lessonLogNotes,
        author: currentUser?.fullName || currentUser?.username || "Öğretmen",
      });
    });
    setLessonLogOpen(false);
    setSelectedLessonCategory("");
    setSelectedLessonTopicId("");
    setSelectedLessonSubTopic("");
    setLessonLogNotes("");
    setSelectedStudents([]);
    alert(`${selectedStudents.length} öğrenciye ders işlemesi kaydedildi`);
  };

  const handleSaveBulk = () => {
    if (
      !confirm("Tüm öğrencilerin gelişim verileri kaydedilecek. Emin misiniz?")
    )
      return;
    let count = 0;
    studentsToShow.forEach((s) => {
      const d = bulkData[s.id];
      if (d && (d.kp || d.kc || d.rp || d.rc || d.ec)) {
        data.addProgress({
          studentId: s.id,
          date: progDate,
          kuranPages: Number(d.kp) || 0,
          kuranCurrentPage: Number(d.kc) || 0,
          risalePages: Number(d.rp) || 0,
          risaleCurrentPage: Number(d.rc) || 0,
          elifbaCurrentPage: Number(d.ec) || 0,
          notes: d.note || "",
        });
        count++;
      }
    });
    setSaved(true);
    alert(`${count} öğrencinin gelişimi kaydedildi`);
  };

  const sendEmail = async (student: Student) => {
    if (!student.email) {
      alert("Öğrencinin e-posta adresi bulunmuyor");
      return;
    }
    const lp = lastProg(student.id);
    const subjectRaw = `${student.firstName} ${student.lastName} - Gelişim Raporu`;
    const text =
      `Sayın ${student.parentName || "Veli"},\n\n` +
      `${student.firstName} ${student.lastName} adlı öğrencimizin son gelişim durumu:\n\n` +
      (lp
        ? `Kuran: S.${lp.kuranCurrentPage}\nRisale: S.${lp.risaleCurrentPage}\nElif-ba: S.${lp.elifbaCurrentPage}\nNot: ${lp.notes || "-"}\n`
        : "Henüz kayıt yok.\n") +
      `\nSaygılarımızla.`;
    const html = `<html><body style="font-family:Arial,Helvetica,sans-serif;white-space:pre-wrap;">${text.replace(/\n/g, "<br>")}</body></html>`;

    try {
      await sendMailViaPhp({
        to: student.email,
        subject: subjectRaw,
        html,
        text,
      });
      alert("E-posta gönderildi.");
    } catch (err: any) {
      const subject = encodeURIComponent(subjectRaw);
      const body = encodeURIComponent(text);
      window.open(
        `mailto:${student.email}?subject=${subject}&body=${body}`,
        "_blank",
      );
      alert(
        `Mail servisi kullanılamadı (${err?.message || "hata"}). Taslak, e-posta uygulamasında açıldı.`,
      );
    }
  };

  const sendSMS = (student: Student) => {
    const lp = lastProg(student.id);
    const text = encodeURIComponent(
      `${student.firstName} ${student.lastName} gelişim: ` +
        (lp
          ? `Kuran S.${lp.kuranCurrentPage}, Risale S.${lp.risaleCurrentPage}`
          : "Henüz kayıt yok"),
    );
    window.open(
      `sms:${student.parentPhone || student.phone || ""}?body=${text}`,
      "_blank",
    );
  };

  const goStudentPage = (studentId: number) => {
    navigate(
      canEdit ? `/student-form/${studentId}` : `/student-profile/${studentId}`,
    );
  };
  /*
  if (
    data.loadingStudents || data.loadingClassRooms || data.loadingLessons ||
    data.loadingSchools || data.loadingProgress || data.loadingAttendance ||
    data.loadingHomeworkTemplates || data.loadingCurriculumTopics ||
    !teacherLessonsLoaded
  ) {
    return <Loading />;
  }*/

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Gelişim Takibi
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={activeView === "summary" ? "default" : "outline"}
            onClick={() => setActiveView("summary")}
          >
            <BarChart3 size={16} className="mr-1" />
            Özet
          </Button>
          <Button
            size="sm"
            variant={activeView === "bulk" ? "default" : "outline"}
            onClick={() => setActiveView("bulk")}
          >
            <TrendingUp size={16} className="mr-1" />
            Toplu Giriş
          </Button>
          <Button
            size="sm"
            variant={activeView === "records" ? "default" : "outline"}
            onClick={() => setActiveView("records")}
          >
            <FileText size={16} className="mr-1" />
            Kayıtlar
          </Button>
        </div>
      </div>

      {/* --- OZET TABLO (Tum ogrenciler son durum) --- */}
      {activeView === "summary" && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Özet Filtreleri</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1 w-full sm:w-64">
                  <Label className="text-xs">Grup</Label>
                  <Select
                    value={summaryFilterGroup}
                    onValueChange={setSummaryFilterGroup}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tüm gruplar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Gruplar</SelectItem>
                      {summaryGroupOptions.map((cr) => (
                        <SelectItem key={cr.id} value={String(cr.id)}>
                          {cr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {summaryFilterGroup !== "all" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSummaryFilterGroup("all")}
                  >
                    <X size={14} className="mr-1" /> Filtreyi Temizle
                  </Button>
                )}
                <div className="space-y-1 w-full sm:w-64">
                  <Label className="text-xs">Öğrenci Ara</Label>
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <Input
                      placeholder="İsim ara..."
                      value={summarySearch}
                      onChange={(e) => setSummarySearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ogretmen bilgilendirme mesajlari */}
          {isTeacher && myLessonIds.length === 0 && myGroupIds.length === 0 && (
            <Card className="border-orange-300 bg-orange-50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle
                  size={20}
                  className="text-orange-600 flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    Size atanmış ders veya grup bulunmamaktadır.
                  </p>
                  <p className="text-xs text-orange-600">
                    Gelişim takibi yapabilmek için yetkili kişiden size ders
                    ataması (Öğretmen Dersleri) veya grup ataması (Gruplar)
                    yapılmasını isteyin.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {isTeacher &&
            (myLessonIds.length > 0 || myGroupIds.length > 0) &&
            myStudents.length === 0 && (
              <Card className="border-blue-300 bg-blue-50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Info size={20} className="text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Atanmış derslerinize veya gruplarınıza kayıtlı öğrenci
                      bulunmamaktadır.
                    </p>
                    {myLessonIds.length > 0 && (
                      <p className="text-xs text-blue-600">
                        Dersler:{" "}
                        {myLessonIds
                          .map(
                            (id) => data.lessons.find((l) => l.id === id)?.name,
                          )
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                    {myGroupIds.length > 0 && (
                      <p className="text-xs text-blue-600">
                        Gruplar:{" "}
                        {myGroupIds
                          .map(
                            (id) =>
                              data.classRooms.find((c) => c.id === id)?.name,
                          )
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          {isTeacher && (myLessonIds.length > 0 || myGroupIds.length > 0) && (
            <p className="text-xs text-gray-500">
              {myLessonIds.length > 0 && (
                <>
                  Dersler:{" "}
                  {myLessonIds
                    .map((id) => data.lessons.find((l) => l.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")}{" "}
                  •{" "}
                </>
              )}
              {myGroupIds.length > 0 && (
                <>
                  Gruplar:{" "}
                  {myGroupIds
                    .map((id) => data.classRooms.find((c) => c.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")}{" "}
                  •{" "}
                </>
              )}
              {summaryStudents.length} öğrenci
            </p>
          )}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Tüm Öğrencilerin Son Durumu
              </CardTitle>
              <CardDescription>
                {summaryStudents.length} öğrenci
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Öğrenci</TableHead>
                    <TableHead className="text-xs">Sınıf</TableHead>
                    <TableHead className="text-xs text-center">Kuran</TableHead>
                    <TableHead className="text-xs text-center">
                      Risale
                    </TableHead>
                    <TableHead className="text-xs text-center">
                      Elif-ba
                    </TableHead>
                    <TableHead className="text-xs text-center">
                      Bugün Yoklama
                    </TableHead>
                    <TableHead className="text-xs text-center">
                      Yoklama <span className="text-gray-400">(7g)</span>
                    </TableHead>
                    <TableHead className="text-xs">Son Kayıt</TableHead>
                    <TableHead className="text-xs">Bildirim</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryStudents.map((s) => {
                    const lp = lastProg(s.id);
                    // Son 7 gun yoklamasi
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const todayStr = new Date().toISOString().split("T")[0];
                    const sevenDaysAgo = new Date(today);
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    const recentAtt = data.attendance.filter(
                      (a) =>
                        a.studentId === s.id &&
                        new Date(a.date) >= sevenDaysAgo,
                    );
                    const presentCount = recentAtt.filter(
                      (a) => a.status === "present",
                    ).length;
                    const absentCount = recentAtt.filter(
                      (a) => a.status === "absent",
                    ).length;
                    let attBadge = (
                      <span className="text-xs text-gray-400">-</span>
                    );
                    if (recentAtt.length > 0) {
                      if (absentCount > 2)
                        attBadge = (
                          <Badge
                            variant="outline"
                            className="text-red-700 border-red-300 text-xs"
                          >
                            {presentCount}/{recentAtt.length}
                          </Badge>
                        );
                      else
                        attBadge = (
                          <Badge
                            variant="outline"
                            className="text-green-700 border-green-300 text-xs"
                          >
                            {presentCount}/{recentAtt.length}
                          </Badge>
                        );
                    }
                    // Bugun yoklamasi
                    const todayAtt = data.attendance.find(
                      (a) => a.studentId === s.id && a.date === todayStr,
                    );
                    const markToday = (status: "present" | "absent") => {
                      const lessonId = s.lessons[0] || data.lessons[0]?.id || 1;
                      if (todayAtt)
                        data.updateAttendanceStatus(todayAtt.id, status);
                      else
                        data.addAttendance({
                          studentId: s.id,
                          date: todayStr,
                          status,
                          lessonId,
                          note: undefined,
                        });
                    };
                    return (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer hover:bg-blue-50"
                        onClick={() => goStudentPage(s.id)}
                      >
                        <TableCell className="font-medium text-sm">
                          {s.firstName} {s.lastName}
                        </TableCell>
                        <TableCell className="text-xs">{s.grade}</TableCell>
                        <TableCell className="text-center">
                          {lp ? (
                            <Badge
                              variant="outline"
                              className="text-green-700 border-green-300 text-xs"
                            >
                              S.{lp.kuranCurrentPage}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {lp ? (
                            <Badge
                              variant="outline"
                              className="text-purple-700 border-purple-300 text-xs"
                            >
                              S.{lp.risaleCurrentPage}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {lp ? (
                            <Badge
                              variant="outline"
                              className="text-orange-700 border-orange-300 text-xs"
                            >
                              S.{lp.elifbaCurrentPage}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant={
                                todayAtt?.status === "present"
                                  ? "default"
                                  : "outline"
                              }
                              className={`text-[10px] h-6 px-2 ${todayAtt?.status === "present" ? "bg-green-600" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                markToday("present");
                              }}
                            >
                              Var
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                todayAtt?.status === "absent"
                                  ? "default"
                                  : "outline"
                              }
                              className={`text-[10px] h-6 px-2 ${todayAtt?.status === "absent" ? "bg-red-600" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                markToday("absent");
                              }}
                            >
                              Yok
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {attBadge}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {lp ? lp.date : "Kayıt yok"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => sendEmail(s)}
                              title="E-posta gönder"
                            >
                              <Mail size={14} className="text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => sendSMS(s)}
                              title="SMS gönder"
                            >
                              <Smartphone
                                size={14}
                                className="text-green-500"
                              />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {summaryStudents.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-sm text-gray-500 py-8"
                      >
                        Seçili grupta öğrenci bulunamadı
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* --- TOPLU GIRIS (Seans bazinda) --- */}
      {activeView === "bulk" && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Filtreler{" "}
                  {activeFiltersCount > 0 && (
                    <Badge
                      variant="outline"
                      className="text-emerald-600 border-emerald-300 text-xs ml-2"
                    >
                      {activeFiltersCount} aktif
                    </Badge>
                  )}
                </CardTitle>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterGroup("all");
                      setFilterSchool("all");
                      setFilterGrade("all");
                      setFilterAgeMin("");
                      setFilterAgeMax("");
                      setSelLesson("");
                    }}
                  >
                    <X size={14} className="mr-1" /> Filtreleri Temizle
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Tarih</Label>
                  <Input
                    type="date"
                    value={progDate}
                    onChange={(e) => {
                      setProgDate(e.target.value);
                      setSaved(false);
                    }}
                    className="w-36"
                  />
                </div>
                <div className="space-y-1 w-full sm:w-48">
                  <Label className="text-xs">Grup</Label>
                  <Select
                    value={filterGroup}
                    onValueChange={(v) => {
                      setFilterGroup(v);
                      setSelectedStudents([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tüm gruplar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Gruplar</SelectItem>
                      {data.classRooms
                        .filter((c) => c.active)
                        .map((cr) => (
                          <SelectItem key={cr.id} value={String(cr.id)}>
                            {cr.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 w-full sm:w-56">
                  <Label className="text-xs">Ders / Seans</Label>
                  <Select
                    value={selLesson || "all"}
                    onValueChange={(v) => {
                      setSelLesson(v === "all" ? "" : v);
                      setSaved(false);
                      setSelectedStudents([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tüm dersler" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Dersler</SelectItem>
                      {data.lessons.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Yaş Min</Label>
                  <Input
                    type="number"
                    value={filterAgeMin}
                    onChange={(e) => {
                      setFilterAgeMin(e.target.value);
                      setSelectedStudents([]);
                    }}
                    placeholder="Min"
                    className="w-16"
                    min={0}
                    max={30}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Yaş Max</Label>
                  <Input
                    type="number"
                    value={filterAgeMax}
                    onChange={(e) => {
                      setFilterAgeMax(e.target.value);
                      setSelectedStudents([]);
                    }}
                    placeholder="Max"
                    className="w-16"
                    min={0}
                    max={30}
                  />
                </div>
                <div className="space-y-1 w-full sm:w-48">
                  <Label className="text-xs">Medrese</Label>
                  <Select
                    value={filterSchool}
                    onValueChange={(v) => {
                      setFilterSchool(v);
                      setSelectedStudents([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tüm medreseler" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Medreseler</SelectItem>
                      {data.schools.map((sc) => (
                        <SelectItem key={sc.id} value={String(sc.id)}>
                          {sc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 w-full sm:w-36">
                  <Label className="text-xs">Sınıf</Label>
                  <Select
                    value={filterGrade}
                    onValueChange={(v) => {
                      setFilterGrade(v);
                      setSelectedStudents([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tüm sınıflar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Sınıflar</SelectItem>
                      {gradeOptions.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
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
                      value={bulkSearch}
                      onChange={(e) => setBulkSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {studentsToShow.length > 0 && (
            <>
              {/* Seçim toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAllStudents}
                  >
                    <CheckSquare size={14} className="mr-1" /> Tümünü Seç
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={deselectAllStudents}
                  >
                    <X size={14} className="mr-1" /> Seçimi Temizle
                  </Button>
                </div>
                {selectedStudents.length > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setHomeworkOpen(true)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <BookOpen size={14} className="mr-1" />{" "}
                      {selectedStudents.length} Öğrenciye Ödev Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setLessonLogOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <NotebookPen size={14} className="mr-1" />{" "}
                      {selectedStudents.length} Öğrenciye Ders İşle
                    </Button>
                  </>
                )}
                {saved && (
                  <Badge
                    variant="outline"
                    className="text-green-600 border-green-300"
                  >
                    <CheckCircle2 size={14} className="mr-1" /> Kaydedildi
                  </Badge>
                )}
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Toplu Gelişim Girişi
                    {selectedLessonId
                      ? ` — ${data.lessons.find((l) => l.id === selectedLessonId)?.name}`
                      : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto overflow-y-auto max-h-[70vh]">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-8">✓</TableHead>
                        <TableHead className="text-xs">Öğrenci</TableHead>
                        <TableHead className="text-xs text-center w-24">
                          K.Ok
                        </TableHead>
                        <TableHead className="text-xs text-center w-24">
                          K.Son
                        </TableHead>
                        <TableHead className="text-xs text-center w-24">
                          R.Ok
                        </TableHead>
                        <TableHead className="text-xs text-center w-24">
                          R.Son
                        </TableHead>
                        <TableHead className="text-xs text-center w-24">
                          Elif.Son
                        </TableHead>
                        <TableHead className="text-xs">Not</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentsToShow.map((s) => (
                        <TableRow
                          key={s.id}
                          className={`hover:bg-blue-50 transition-colors ${selectedStudents.includes(s.id) ? "bg-purple-50" : ""}`}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(s.id)}
                              onChange={() => toggleStudentSelection(s.id)}
                              className="w-4 h-4 accent-emerald-600 cursor-pointer"
                            />
                          </TableCell>
                          <TableCell
                            className="font-medium text-sm whitespace-nowrap cursor-pointer"
                            onClick={() => navigate(`/student-profile/${s.id}`)}
                          >
                            {s.firstName} {s.lastName}
                            <p className="text-[10px] text-gray-400">
                              {s.grade}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              size={1}
                              className="h-8 text-xs w-full min-w-16"
                              value={bulkData[s.id]?.kp || ""}
                              onChange={(e) =>
                                updateBulk(s.id, "kp", e.target.value)
                              }
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              size={1}
                              className="h-8 text-xs w-full min-w-16"
                              value={bulkData[s.id]?.kc || ""}
                              onChange={(e) =>
                                updateBulk(s.id, "kc", e.target.value)
                              }
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              size={1}
                              className="h-8 text-xs w-full min-w-16"
                              value={bulkData[s.id]?.rp || ""}
                              onChange={(e) =>
                                updateBulk(s.id, "rp", e.target.value)
                              }
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              size={1}
                              className="h-8 text-xs w-full min-w-16"
                              value={bulkData[s.id]?.rc || ""}
                              onChange={(e) =>
                                updateBulk(s.id, "rc", e.target.value)
                              }
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              size={1}
                              className="h-8 text-xs w-full min-w-16"
                              value={bulkData[s.id]?.ec || ""}
                              onChange={(e) =>
                                updateBulk(s.id, "ec", e.target.value)
                              }
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              className="h-8 text-xs w-full min-w-40"
                              value={bulkData[s.id]?.note || ""}
                              onChange={(e) =>
                                updateBulk(s.id, "note", e.target.value)
                              }
                              placeholder="Not..."
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Button onClick={handleSaveBulk} className="w-full" size="lg">
                <Save size={18} className="mr-2" /> Tümünü Kaydet
              </Button>

              {/* Toplu Odev Dialog — Hazir Odev Secimi */}
              <Dialog open={homeworkOpen} onOpenChange={setHomeworkOpen}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      Toplu Ödev Ver ({selectedStudents.length} öğrenci)
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2 max-h-[60vh] overflow-y-auto">
                    {/* Hazir odevler */}
                    <div className="space-y-1">
                      <Label className="text-xs">Hazır Ödev Seçin</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {data.homeworkTemplates
                          .filter((t) => t.active)
                          .map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSelectedTemplateId(String(t.id));
                              }}
                              className={`text-left p-3 rounded-lg border transition-colors ${selectedTemplateId === String(t.id) ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:bg-gray-50"}`}
                            >
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {t.type === "ezber"
                                    ? "Ezber"
                                    : t.type === "okuma-kuran"
                                      ? "Kuran"
                                      : t.type === "okuma-risale"
                                        ? "Risale"
                                        : "Diğer"}
                                </Badge>
                                <span className="font-medium text-sm">
                                  {t.title}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {t.content}{" "}
                                {t.details ? `(${t.details} sayfa)` : ""}
                              </p>
                            </button>
                          ))}
                        {/* Diger / Manuel */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTemplateId("custom");
                          }}
                          className={`text-left p-3 rounded-lg border transition-colors ${selectedTemplateId === "custom" ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:bg-gray-50"}`}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              Diğer
                            </Badge>
                            <span className="font-medium text-sm">
                              Manuel Ödev Gir
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Kendi ödevinizi yazın
                          </p>
                        </button>
                      </div>
                    </div>
                    {/* Diger seciliyse manuel form */}
                    {selectedTemplateId === "custom" && (
                      <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                        <div className="space-y-1">
                          <Label className="text-xs">Ödev Başlığı *</Label>
                          <Input
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            placeholder="Örn: Yasin Suresi Ezberi"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">İçerik *</Label>
                          <Textarea
                            value={customContent}
                            onChange={(e) => setCustomContent(e.target.value)}
                            placeholder="Ödev açıklaması..."
                            rows={2}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Detay (sayfa vb.)</Label>
                          <Input
                            value={customDetails}
                            onChange={(e) => setCustomDetails(e.target.value)}
                            placeholder="Örn: 5 sayfa"
                          />
                        </div>
                      </div>
                    )}
                    {/* Secili hazir odev ozeti */}
                    {selectedTemplate && (
                      <div className="p-3 bg-emerald-50 rounded-lg">
                        <p className="text-xs text-emerald-700 font-medium">
                          Seçilen: {selectedTemplate.title}
                        </p>
                        <p className="text-xs text-emerald-600">
                          {selectedTemplate.content}{" "}
                          {selectedTemplate.details
                            ? `(${selectedTemplate.details} sayfa)`
                            : ""}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button onClick={handleSaveHomework} className="flex-1">
                        <Send size={16} className="mr-1" /> Ödev Ver
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setHomeworkOpen(false);
                          setSelectedTemplateId("");
                          setCustomTitle("");
                          setCustomContent("");
                          setCustomDetails("");
                        }}
                      >
                        İptal
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Toplu Ders İşleme Dialog */}
              <Dialog open={lessonLogOpen} onOpenChange={setLessonLogOpen}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      Toplu Ders İşleme ({selectedStudents.length} öğrenci)
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2 max-h-[60vh] overflow-y-auto">
                    {/* Tarih */}
                    <div className="space-y-1">
                      <Label className="text-xs">Tarih</Label>
                      <Input
                        type="date"
                        value={progDate}
                        onChange={(e) => setProgDate(e.target.value)}
                      />
                    </div>
                    {/* Kategori */}
                    <div className="space-y-1">
                      <Label className="text-xs">Kategori *</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["ilmihal", "adab", "tecvid"] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setSelectedLessonCategory(cat);
                              setSelectedLessonTopicId("");
                              setSelectedLessonSubTopic("");
                            }}
                            className={`p-3 rounded-lg border text-center transition-colors ${selectedLessonCategory === cat ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:bg-gray-50"}`}
                          >
                            <GraduationCap
                              size={18}
                              className={`mx-auto mb-1 ${selectedLessonCategory === cat ? "text-emerald-600" : "text-gray-400"}`}
                            />
                            <span className="text-xs font-medium">{cat}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Konu */}
                    {selectedLessonCategory && (
                      <div className="space-y-1">
                        <Label className="text-xs">Konu *</Label>
                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                          {filteredTopics.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSelectedLessonTopicId(String(t.id));
                                setSelectedLessonSubTopic("");
                              }}
                              className={`text-left p-3 rounded-lg border transition-colors ${selectedLessonTopicId === String(t.id) ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:bg-gray-50"}`}
                            >
                              <span className="font-medium text-sm">
                                {t.title}
                              </span>
                              <p className="text-[10px] text-gray-400">
                                {t.subTopics.length} alt konu
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Alt Konu */}
                    {selectedTopic && (
                      <div className="space-y-1">
                        <Label className="text-xs">Alt Konu *</Label>
                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                          {selectedTopic.subTopics.map((st: string) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setSelectedLessonSubTopic(st)}
                              className={`text-left p-2 rounded-lg border transition-colors ${selectedLessonSubTopic === st ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:bg-gray-50"}`}
                            >
                              <span className="text-sm">{st}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Notlar */}
                    <div className="space-y-1">
                      <Label className="text-xs">Ders Notu</Label>
                      <Textarea
                        value={lessonLogNotes}
                        onChange={(e) => setLessonLogNotes(e.target.value)}
                        placeholder="Ders ile ilgili notlar..."
                        rows={2}
                      />
                    </div>
                    {/* Özet */}
                    {selectedLessonCategory &&
                      selectedLessonTopicId &&
                      selectedLessonSubTopic && (
                        <div className="p-3 bg-emerald-50 rounded-lg">
                          <p className="text-xs text-emerald-700 font-medium">
                            {selectedLessonCategory === "ilmihal"
                              ? "İlmihal"
                              : selectedLessonCategory === "adab"
                                ? "Adab"
                                : "Tecvid"}{" "}
                            → {selectedTopic?.title} → {selectedLessonSubTopic}
                          </p>
                        </div>
                      )}
                    <div className="flex gap-2 pt-1">
                      <Button onClick={handleSaveLessonLog} className="flex-1">
                        <NotebookPen size={16} className="mr-1" /> Ders İşle
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setLessonLogOpen(false);
                          setSelectedLessonCategory("");
                          setSelectedLessonTopicId("");
                          setSelectedLessonSubTopic("");
                          setLessonLogNotes("");
                        }}
                      >
                        İptal
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          {studentsToShow.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
              <p>Seçili filtrelere uygun öğrenci bulunamadı</p>
            </div>
          )}
        </>
      )}

      {/* --- KAYITLAR (Detayli gecmis) --- */}
      {activeView === "records" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tüm Gelişim Kayıtları</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {canViewColumn("progress", "date") && (
                    <TableHead className="text-xs">Tarih</TableHead>
                  )}
                  {canViewColumn("progress", "student") && (
                    <TableHead className="text-xs">Öğrenci</TableHead>
                  )}
                  {canViewColumn("progress", "kuran") && (
                    <TableHead className="text-xs">Kuran</TableHead>
                  )}
                  {canViewColumn("progress", "risale") && (
                    <TableHead className="text-xs">Risale</TableHead>
                  )}
                  {canViewColumn("progress", "elifba") && (
                    <TableHead className="text-xs">Elif-ba</TableHead>
                  )}
                  {canViewColumn("progress", "notes") && (
                    <TableHead className="text-xs">Notlar</TableHead>
                  )}
                  {canViewColumn("progress", "actions") && (
                    <TableHead className="text-xs">İşlem</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.progress.map((p) => {
                  const s = data.students.find((x) => x.id === p.studentId);
                  return (
                    <TableRow key={p.id}>
                      {canViewColumn("progress", "date") && (
                        <TableCell className="text-xs">{p.date}</TableCell>
                      )}
                      {canViewColumn("progress", "student") && (
                        <TableCell className="font-medium text-xs">
                          {s?.firstName} {s?.lastName}
                        </TableCell>
                      )}
                      {canViewColumn("progress", "kuran") && (
                        <TableCell className="text-xs">
                          +{p.kuranPages}/S.{p.kuranCurrentPage}
                        </TableCell>
                      )}
                      {canViewColumn("progress", "risale") && (
                        <TableCell className="text-xs">
                          +{p.risalePages}/S.{p.risaleCurrentPage}
                        </TableCell>
                      )}
                      {canViewColumn("progress", "elifba") && (
                        <TableCell className="text-xs">
                          S.{p.elifbaCurrentPage}
                        </TableCell>
                      )}
                      {canViewColumn("progress", "notes") && (
                        <TableCell className="text-xs text-gray-500 max-w-[150px] truncate">
                          {p.notes}
                        </TableCell>
                      )}
                      {canViewColumn("progress", "actions") && (
                        <TableCell>
                          <div className="flex gap-1">
                            {canEdit && s && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  navigate(`/student-form/${s.id}`)
                                }
                                title="Öğrenciyi düzenle"
                              >
                                <Pencil size={14} />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                if (confirm("Gelişim kaydı silinsin mi?"))
                                  data.deleteProgress(p.id);
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
                {data.progress.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-gray-500"
                    >
                      Kayıt yok
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
