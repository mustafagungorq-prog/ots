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

// ====== HOMEWORK TEMPLATES PAGE ======
export function HomeworkTemplatesPage() {
  const data = useStudentData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HomeworkTemplate | null>(null);
  const [form, setForm] = useState<Partial<HomeworkTemplate>>({
    type: "ezber",
    active: true,
  });

  useEffect(() => {
    data.loadHomeworkTemplates();
  }, []);
  /*
  if (data.loadingHomeworkTemplates) {
    return <Loading />;
  }*/

  const handleSubmit = () => {
    if (!form.title || !form.content) return;
    if (editing) data.updateHomeworkTemplate(editing.id, form);
    else data.addHomeworkTemplate(form as Omit<HomeworkTemplate, "id">);
    setOpen(false);
    setEditing(null);
    setForm({ type: "ezber", active: true });
  };

  const typeColors: Record<string, string> = {
    ezber: "bg-purple-100 text-purple-700",
    "okuma-kuran": "bg-green-100 text-green-700",
    "okuma-risale": "bg-orange-100 text-orange-700",
    diger: "bg-gray-100 text-gray-700",
  };
  const typeLabels: Record<string, string> = {
    ezber: "Ezber",
    "okuma-kuran": "Kuran Okuma",
    "okuma-risale": "Risale Okuma",
    diger: "Diğer",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Ödev Tanımları
        </h2>
        <Button
          onClick={() => {
            setEditing(null);
            setForm({ type: "ezber", active: true });
            setOpen(true);
          }}
        >
          <Plus size={18} className="mr-1" /> Ödev Ekle
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.homeworkTemplates.map((t) => (
          <Card key={t.id} className={t.active ? "" : "opacity-50"}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    className={`${typeColors[t.type || "diger"]} text-[10px]`}
                  >
                    {typeLabels[t.type || "diger"]}
                  </Badge>
                  {t.active ? (
                    <Badge
                      variant="outline"
                      className="text-green-600 border-green-300 text-[10px]"
                    >
                      Aktif
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-gray-400 text-[10px]"
                    >
                      Pasif
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditing(t);
                      setForm(t);
                      setOpen(true);
                    }}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      if (confirm("Ödev tanımı silinsin mi?"))
                        data.deleteHomeworkTemplate(t.id);
                    }}
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </Button>
                </div>
              </div>
              <CardTitle className="text-sm mt-2">{t.title}</CardTitle>
              <CardDescription className="text-xs">
                {t.content}{" "}
                {t.details ? (
                  <span className="font-medium">({t.details} sayfa)</span>
                ) : (
                  ""
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
        {data.homeworkTemplates.length === 0 && (
          <p className="text-center py-8 text-gray-500 col-span-3">
            Henüz ödev tanımı yok
          </p>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Ödev Düzenle" : "Yeni Ödev Tanımı"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <div className="space-y-1">
              <Label className="text-xs">Ödev Tipi *</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm({ ...form, type: v as HomeworkTemplate["type"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ezber">Ezber</SelectItem>
                  <SelectItem value="okuma-kuran">Kuran Okuma</SelectItem>
                  <SelectItem value="okuma-risale">Risale Okuma</SelectItem>
                  <SelectItem value="diger">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Başlık *</Label>
              <Input
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Örn: Fatiha Suresi Ezberi"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">İçerik *</Label>
              <Textarea
                value={form.content || ""}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Ödev açıklaması..."
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Detay (sayfa sayısı vb.)</Label>
              <Input
                value={form.details || ""}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
                placeholder="Örn: 5"
              />
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
