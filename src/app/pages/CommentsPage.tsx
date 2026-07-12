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

// ====== COMMENTS PAGE ======
export function CommentsPage() {
  const data = useStudentData();
  const { canViewColumn } = useAuth();

  useEffect(() => {
    data.loadStudents();
    data.loadComments();
  }, []);

  const [selStudent, setSelStudent] = useState("");
  const [type, setType] = useState<"teacher" | "parent">("teacher");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const handleSubmit = () => {
    if (!selStudent || !content || !author) return;
    data.addComment({ studentId: Number(selStudent), type, author, content });
    setContent("");
    setAuthor("");
  };
  const filtered = selStudent
    ? data.comments.filter((c) => c.studentId === Number(selStudent))
    : data.comments;

  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Yorumlar</h2>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Yeni Yorum</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Öğrenci</Label>
              <Select value={selStudent} onValueChange={setSelStudent}>
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
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tür</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as "teacher" | "parent")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Öğretmen Yorumu</SelectItem>
                  <SelectItem value="parent">Veli Yorumu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Yazan</Label>
              <Input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ad Soyad"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Yorum</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Yorumunuz..."
              rows={3}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!selStudent || !content || !author}
          >
            Yorum Ekle
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Yorumlar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered
              .slice()
              .reverse()
              .map((c) => {
                const s = data.students.find((x) => x.id === c.studentId);
                return (
                  <div key={c.id} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          {canViewColumn("comments", "student") && (
                            <span className="font-medium text-sm">
                              {s?.firstName} {s?.lastName}
                            </span>
                          )}
                          {canViewColumn("comments", "type") && (
                            <Badge
                              variant={
                                c.type === "teacher" ? "default" : "secondary"
                              }
                              className="text-xs"
                            >
                              {c.type === "teacher" ? "Öğretmen" : "Veli"}
                            </Badge>
                          )}
                          {canViewColumn("comments", "author") && (
                            <span className="text-xs text-gray-500">
                              {c.author}
                            </span>
                          )}
                          {canViewColumn("comments", "date") && (
                            <span className="text-xs text-gray-400">
                              {c.createdAt}
                            </span>
                          )}
                        </div>
                        {canViewColumn("comments", "content") && (
                          <p className="text-sm text-gray-700">{c.content}</p>
                        )}
                      </div>
                      {canViewColumn("comments", "actions") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (confirm("Yorum silinsin mi?"))
                              data.deleteComment(c.id);
                          }}
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            {filtered.length === 0 && (
              <p className="text-center py-8 text-gray-500">Henüz yorum yok</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
