import { useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { PERMISSIONS } from "@/types";
import { LoginPage, MainLayout, AuthGuard } from "./app/shell";

import { DashboardPage } from "./app/pages/DashboardPage";
import { StudentFormPage } from "./app/pages/StudentFormPage";
import { StudentsPage } from "./app/pages/StudentsPage";
import { SchoolsPage } from "./app/pages/SchoolsPage";
import { ClassesPage } from "./app/pages/ClassesPage";
import { LessonsPage } from "./app/pages/LessonsPage";
import { AttendancePage } from "./app/pages/AttendancePage";
import { TeacherLessonsPage } from "./app/pages/TeacherLessonsPage";
import { ProgressPage } from "./app/pages/ProgressPage";
import { CommentsPage } from "./app/pages/CommentsPage";
import { ReportsPage } from "./app/pages/ReportsPage";
import { PermissionsPage } from "./app/pages/PermissionsPage";
import { UsersPage } from "./app/pages/UsersPage";
import { SurveyManagementPage } from "./app/pages/SurveyManagementPage";
import { StudentProfilePage } from "./app/pages/StudentProfilePage";
import { HomeworkTemplatesPage } from "./app/pages/HomeworkTemplatesPage";
import { HomeworkTrackingPage } from "./app/pages/HomeworkTrackingPage";
import { MemorizationTrackingPage } from "./app/pages/MemorizationTrackingPage";
import { MemorizationTextsAdminPage } from "./app/pages/MemorizationTextsAdminPage";
import { ParentStudentLinksPage } from "./app/pages/ParentStudentLinksPage";
import { ParentStudentsPage } from "./app/pages/ParentStudentsPage";

const routeConfig = [
  {
    path: "/students",
    component: StudentsPage,
    roles: ["superadmin", "admin", "authorized_teacher"],
  },
  {
    path: "/student-form",
    component: StudentFormPage,
    roles: PERMISSIONS.STUDENT_CREATE,
  },
  {
    path: "/student-form/:id",
    component: StudentFormPage,
    roles: PERMISSIONS.STUDENT_EDIT,
  },
  {
    path: "/schools",
    component: SchoolsPage,
    roles: PERMISSIONS.SCHOOL_MANAGE,
  },
  {
    path: "/lessons",
    component: LessonsPage,
    roles: PERMISSIONS.LESSON_MANAGE,
  },
  {
    path: "/classes",
    component: ClassesPage,
    roles: ["superadmin", "admin", "authorized_teacher"],
  },
  {
    path: "/attendance",
    component: AttendancePage,
    roles: ["superadmin", "admin", "authorized_teacher", "teacher"],
  },
  {
    path: "/progress",
    component: ProgressPage,
    roles: PERMISSIONS.PROGRESS_CREATE,
  },
  {
    path: "/teacher-lessons",
    component: TeacherLessonsPage,
    roles: ["superadmin"],
  },
  {
    path: "/comments",
    component: CommentsPage,
    roles: ["superadmin", "admin", "authorized_teacher"],
  },
  {
    path: "/reports",
    component: ReportsPage,
    roles: PERMISSIONS.REPORT_CREATE,
  },
  {
    path: "/permissions",
    component: PermissionsPage,
    roles: PERMISSIONS.PERMISSION_MANAGE,
  },
  {
    path: "/users",
    component: UsersPage,
    roles: PERMISSIONS.USER_MANAGE,
  },
  {
    path: "/surveys",
    component: SurveyManagementPage,
    roles: ["superadmin", "admin"],
  },
  {
    path: "/homework-templates",
    component: HomeworkTemplatesPage,
    roles: ["superadmin", "admin"],
  },
  {
    path: "/homework-tracking",
    component: HomeworkTrackingPage,
    roles: PERMISSIONS.PROGRESS_CREATE,
  },
  {
    path: "/memorization-tracking",
    component: MemorizationTrackingPage,
    roles: PERMISSIONS.MEMORIZATION_TRACK,
  },
  {
    path: "/memorization-texts-admin",
    component: MemorizationTextsAdminPage,
    roles: ["superadmin", "admin"],
  },
  {
    path: "/parent-student-links",
    component: ParentStudentLinksPage,
    roles: ["superadmin", "admin"],
  },
  {
    path: "/parent-students",
    component: ParentStudentsPage,
    roles: ["parent"],
  },
  {
    path: "/student-profile/:id",
    component: StudentProfilePage,
    roles: [
      "superadmin",
      "admin",
      "authorized_teacher",
      "teacher",
      "parent",
    ],
  },
];

function AppRouter() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!currentUser) return;

    const role = currentUser.role;

    if (role === "parent" && location.pathname === "/") {
      const linkedIds = currentUser.linkedStudentIds || [];
      if (linkedIds.length === 1) {
        navigate(`/student-profile/${linkedIds[0]}`, { replace: true });
      } else {
        navigate("/parent-students", { replace: true });
      }

      return;
    }

    if (role === "teacher") {
      if (
        !location.pathname.startsWith("/progress") &&
        !location.pathname.startsWith("/student-profile")
      ) {
        navigate("/progress", { replace: true });
      }

      return;
    }

    if (role === "authorized_teacher" && location.pathname === "/") {
      navigate("/progress", { replace: true });
    }
  }, [currentUser, location.pathname, navigate]);

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <MainLayout>
      <Routes>
        <Route
          path="/"
          element={
            currentUser.role === "superadmin" ||
            currentUser.role === "admin" ? (
              <DashboardPage />
            ) : currentUser.role === "authorized_teacher" ||
              currentUser.role === "teacher" ? (
              <Navigate to="/progress" replace />
            ) : currentUser.role === "parent" ? (
              <Navigate
                to={`/student-profile/${
                  currentUser.linkedStudentIds?.[0] ?? 0
                }`}
                replace
              />
            ) : (
              <Navigate to="/students" replace />
            )
          }
        />

        {routeConfig.map(({ path, component: Component, roles }) => (
          <Route
            key={path}
            path={path}
            element={
              <AuthGuard requiredRoles={roles}>
                <Component />
              </AuthGuard>
            }
          />
        ))}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

export default AppRouter;