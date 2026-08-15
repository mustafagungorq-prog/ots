import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, useNavigate, useLocation } from "react-router";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  LayoutDashboard,
  Users,
  Plus,
  School as SchoolIcon,
  BookOpenCheck,
  UsersRound,
  ClipboardCheck,
  TrendingUp,
  MessageSquare,
  FileText,
  Shield,
  ClipboardList,
  BookOpen,
  UserCog,
  ListChecks,
  Archive,
  KeyRound,
  Mail,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { PERMISSIONS, ROLE_COLORS, ROLE_LABELS } from "./constants";

export function useCollapsibleSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return {
    collapsed,
    toggle: () => setCollapsed(!collapsed),
    mobileOpen,
    toggleMobile: () => setMobileOpen(!mobileOpen),
    setMobileOpen,
  };
}

export { LoginPage } from "@/app/pages/LoginPage";

export function MainLayout({ children }: { children: ReactNode }) {
  const { currentUser, logout, hasPermission, changePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebar = useCollapsibleSidebar();
  const mobileNavRef = useRef<HTMLElement | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState("");

  const handleChangePassword = async () => {
    if (!currentUser) return;
    if (!newPw || newPw.length < 6) {
      setPwError("Şifre en az 6 karakter olmalıdır");
      return;
    }
    try {
      await changePassword(currentUser.id, newPw);
      setPwOpen(false);
      setNewPw("");
      setPwError("");
      alert("Şifreniz başarıyla değiştirildi");
    } catch (err: any) {
      setPwError(err?.message || "Şifre değiştirilemedi");
    }
  };

  const allTabs = [
    {
      id: "dashboard",
      label: "Ana Sayfa",
      icon: LayoutDashboard,
      path: "/",
      roles: ["superadmin", "admin", "authorized_teacher", "parent"] as const,
    },
    {
      id: "students",
      label: "Öğrenciler",
      icon: Users,
      path: "/students",
      roles: ["superadmin", "admin", "authorized_teacher", "parent"] as const,
    },
    {
      id: "archived-students",
      label: "Arşivli Öğrenciler",
      icon: Archive,
      path: "/archived-students",
      roles: ["superadmin", "admin"] as const,
    },
    {
      id: "student-form",
      label: "Öğrenci Ekle",
      icon: Plus,
      path: "/student-form",
      roles: PERMISSIONS.STUDENT_CREATE,
    },
    {
      id: "schools",
      label: "Medrese",
      icon: SchoolIcon,
      path: "/schools",
      roles: PERMISSIONS.SCHOOL_MANAGE,
    },
    {
      id: "courses",
      label: "Kurslar",
      icon: BookOpenCheck,
      path: "/courses",
      roles: PERMISSIONS.LESSON_MANAGE,
    },
    {
      id: "classes",
      label: "Gruplar",
      icon: UsersRound,
      path: "/classes",
      roles: ["superadmin", "admin", "authorized_teacher"] as const,
    },
    {
      id: "attendance",
      label: "Yoklama",
      icon: ClipboardCheck,
      path: "/attendance",
      roles: ["superadmin", "admin", "authorized_teacher", "teacher"] as const,
    },
    {
      id: "progress",
      label: "Gelişim Takibi",
      icon: TrendingUp,
      path: "/progress",
      roles: PERMISSIONS.PROGRESS_CREATE,
    },

    {
      id: "comments",
      label: "Yorumlar",
      icon: MessageSquare,
      path: "/comments",
      roles: ["superadmin", "admin", "authorized_teacher"] as const,
    },
    {
      id: "reports",
      label: "Raporlar",
      icon: FileText,
      path: "/reports",
      roles: PERMISSIONS.REPORT_CREATE,
    },
    {
      id: "bulk-report-mail",
      label: "Toplu Rapor Mail",
      icon: Mail,
      path: "/bulk-report-mail",
      roles: ["superadmin", "admin", "authorized_teacher", "teacher"] as const,
    },
    {
      id: "permissions",
      label: "Yetki Yönetimi",
      icon: Shield,
      path: "/permissions",
      roles: PERMISSIONS.PERMISSION_MANAGE,
    },
    {
      id: "surveys",
      label: "Anket Yönetimi",
      icon: ClipboardList,
      path: "/surveys",
      roles: ["superadmin", "admin"] as const,
    },
    {
      id: "homework-templates",
      label: "Ödev Tanımları",
      icon: BookOpen,
      path: "/homework-templates",
      roles: ["superadmin", "admin"] as const,
    },
    {
      id: "homework-tracking",
      label: "Ödev Takip",
      icon: ListChecks,
      path: "/homework-tracking",
      roles: PERMISSIONS.PROGRESS_CREATE,
    },
    {
      id: "memorization-tracking",
      label: "Ezber Takip",
      icon: ListChecks,
      path: "/memorization-tracking",
      roles: PERMISSIONS.MEMORIZATION_TRACK,
    },
    {
      id: "memorization-texts-admin",
      label: "Ezber Metin Yönetimi",
      icon: ListChecks,
      path: "/memorization-texts-admin",
      roles: ["superadmin", "admin"] as const,
    },
    {
      id: "users",
      label: "Kullanıcılar",
      icon: UserCog,
      path: "/users",
      roles: PERMISSIONS.USER_MANAGE,
    },
    {
      id: "pending-approvals",
      label: "Üyelik Bekleyenler",
      icon: UserCheck,
      path: "/pending-approvals",
      roles: ["superadmin"] as const,
    },
    {
      id: "parent-student-links",
      label: "Veli-Öğrenci Eşleştirme",
      icon: Users,
      path: "/parent-student-links",
      roles: ["superadmin", "admin"] as const,
    },
  ];

  const visibleTabs =
    currentUser?.role === "parent"
      ? [
          {
            id: "my-students",
            label: "Öğrencilerim",
            icon: Users,
            path: "/parent-students",
            roles: ["parent"] as const,
          },
        ]
      : allTabs.filter((t) => hasPermission(t.roles));
  const handleNav = (path: string) => {
    navigate(path);
    sidebar.setMobileOpen(false);
  };
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (!sidebar.mobileOpen) return;

    const frame = window.requestAnimationFrame(() => {
      const activeItem = mobileNavRef.current?.querySelector(
        '[data-active="true"]',
      ) as HTMLElement | null;
      activeItem?.scrollIntoView({ block: "nearest" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [sidebar.mobileOpen, location.pathname]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9"
                onClick={sidebar.toggleMobile}
              >
                <Menu size={20} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex h-9 w-9"
                onClick={sidebar.toggle}
              >
                {sidebar.collapsed ? (
                  <ChevronRight size={18} />
                ) : (
                  <ChevronLeft size={18} />
                )}
              </Button>
              <div className="bg-emerald-600 p-0.5 rounded-lg w-8 h-8 flex-shrink-0 overflow-hidden">
                <img
                  src="/ots/dist/logo-365.jpg"
                  alt="365 Kuran"
                  className="w-full h-full object-cover rounded"
                />
              </div>
              <h1
                className={`text-base sm:text-lg font-bold text-gray-900 transition-all duration-300 hidden lg:block ${sidebar.collapsed ? "lg:hidden" : ""}`}
              >
                365 Kuran Kuran Mektebi
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Badge
                className={`${ROLE_COLORS[currentUser!.role]} text-white text-xs`}
              >
                {ROLE_LABELS[currentUser!.role]}
              </Badge>
              <span className="text-sm text-gray-700 hidden sm:inline">
                {currentUser!.fullName}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setPwOpen(true)}
                title="Şifre Değiştir"
              >
                <KeyRound size={18} className="text-gray-500" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={logout}
                title="Çıkış"
              >
                <LogOut size={18} className="text-gray-500" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside
          className={`hidden lg:block bg-white border-r h-[calc(100vh-56px)] sm:h-[calc(100vh-64px)] sticky top-14 sm:top-16 transition-all duration-300 z-40 ${sidebar.collapsed ? "w-16" : "w-60"}`}
        >
          <nav className="h-full overflow-y-auto p-2 space-y-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleNav(tab.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive(tab.path) ? "bg-emerald-50 text-emerald-700" : "text-gray-700 hover:bg-gray-50"}`}
                title={sidebar.collapsed ? tab.label : undefined}
              >
                <tab.icon size={18} />
                {!sidebar.collapsed && <span>{tab.label}</span>}
              </button>
            ))}
          </nav>
        </aside>
        {sidebar.mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => sidebar.setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-600 p-0.5 rounded-lg w-7 h-7 overflow-hidden">
                    <img
                      src="/ots/dist/logo-365.jpg"
                      alt="365 Kuran"
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                  <span className="font-bold text-sm">
                    365 Kuran Kuran Mektebi
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => sidebar.setMobileOpen(false)}
                >
                  <X size={18} />
                </Button>
              </div>
              <nav
                ref={mobileNavRef}
                className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1"
              >
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleNav(tab.path)}
                    data-active={isActive(tab.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive(tab.path) ? "bg-emerald-50 text-emerald-700" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    <tab.icon size={18} />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </aside>
          </div>
        )}
        <main className="flex-1 min-w-0 p-3 sm:p-4 lg:p-6">{children}</main>
      </div>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Şifre Değiştir</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <div className="space-y-1">
              <Label className="text-xs">Yeni Şifre</Label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => {
                  setNewPw(e.target.value);
                  setPwError("");
                }}
                placeholder="En az 6 karakter"
              />
            </div>
            {pwError && (
              <p className="text-xs text-red-600">{pwError}</p>
            )}
            <Button onClick={handleChangePassword} className="w-full">
              Değiştir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AuthGuard({
  requiredRoles,
  children,
}: {
  requiredRoles: readonly string[];
  children: ReactNode;
}) {
  const { currentUser, hasPermission } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!hasPermission(requiredRoles)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
