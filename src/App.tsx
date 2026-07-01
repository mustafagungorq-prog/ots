import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { PERMISSIONS } from '@/types';
import {
  LoginPage, 
  MainLayout, 
  AuthGuard, 
} from './app/shell';
import { DashboardPage } from './app/pages/DashboardPage.tsx';
import { StudentFormPage } from './app/pages/StudentFormPage.tsx';
import { StudentsPage } from './app/pages/StudentsPage.tsx';
import { SchoolsPage } from './app/pages/SchoolsPage.tsx';
import { ClassesPage } from './app/pages/ClassesPage.tsx';
import { LessonsPage } from './app/pages/LessonsPage.tsx';
import { AttendancePage } from './app/pages/AttendancePage.tsx';
import { TeacherLessonsPage } from './app/pages/TeacherLessonsPage.tsx';
import { ProgressPage } from './app/pages/ProgressPage.tsx';
import { CommentsPage } from './app/pages/CommentsPage.tsx';
import { ReportsPage } from './app/pages/ReportsPage.tsx';
import { PermissionsPage } from './app/pages/PermissionsPage.tsx';
import { UsersPage } from './app/pages/UsersPage.tsx';
import { SurveyManagementPage } from './app/pages/SurveyManagementPage.tsx';
import { StudentProfilePage } from './app/pages/StudentProfilePage.tsx';
import { HomeworkTemplatesPage } from './app/pages/HomeworkTemplatesPage.tsx';

function AppRouter() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    if (role === 'teacher') {
      if (!location.pathname.startsWith('/progress') && !location.pathname.startsWith('/student-profile')) {
        navigate('/progress', { replace: true });
      }
      return;
    }

    if (role === 'authorized_teacher' && location.pathname === '/') {
      navigate('/progress', { replace: true });
    }
  }, [currentUser, location.pathname, navigate]);

  if (!currentUser) return <Routes><Route path="/login" element={<LoginPage />} /><Route path="*" element={<Navigate to="/login" />} /></Routes>;
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={
          currentUser.role === 'superadmin' || currentUser.role === 'admin'
            ? <DashboardPage />
            : currentUser.role === 'authorized_teacher' || currentUser.role === 'teacher'
              ? <Navigate to="/progress" replace />
              : <Navigate to="/students" replace />
        } />
        <Route path="/students" element={<AuthGuard requiredRoles={['superadmin', 'admin', 'authorized_teacher', 'parent']}><StudentsPage /></AuthGuard>} />
        <Route path="/student-form" element={<AuthGuard requiredRoles={PERMISSIONS.STUDENT_CREATE}><StudentFormPage /></AuthGuard>} />
        <Route path="/student-form/:id" element={<AuthGuard requiredRoles={PERMISSIONS.STUDENT_EDIT}><StudentFormPage /></AuthGuard>} />
        <Route path="/schools" element={<AuthGuard requiredRoles={PERMISSIONS.SCHOOL_MANAGE}><SchoolsPage /></AuthGuard>} />
        <Route path="/lessons" element={<AuthGuard requiredRoles={PERMISSIONS.LESSON_MANAGE}><LessonsPage /></AuthGuard>} />
        <Route path="/classes" element={<AuthGuard requiredRoles={['superadmin', 'admin', 'authorized_teacher']}><ClassesPage /></AuthGuard>} />
        <Route path="/attendance" element={<AuthGuard requiredRoles={['superadmin', 'admin', 'authorized_teacher']}><AttendancePage /></AuthGuard>} />
        <Route path="/progress" element={<AuthGuard requiredRoles={PERMISSIONS.PROGRESS_CREATE}><ProgressPage /></AuthGuard>} />
        <Route path="/teacher-lessons" element={<AuthGuard requiredRoles={['superadmin']}><TeacherLessonsPage /></AuthGuard>} />
        <Route path="/comments" element={<AuthGuard requiredRoles={['superadmin', 'admin', 'authorized_teacher']}><CommentsPage /></AuthGuard>} />
        <Route path="/reports" element={<AuthGuard requiredRoles={PERMISSIONS.REPORT_CREATE}><ReportsPage /></AuthGuard>} />
        <Route path="/permissions" element={<AuthGuard requiredRoles={PERMISSIONS.PERMISSION_MANAGE}><PermissionsPage /></AuthGuard>} />
        <Route path="/users" element={<AuthGuard requiredRoles={PERMISSIONS.USER_MANAGE}><UsersPage /></AuthGuard>} />
        <Route path="/surveys" element={<AuthGuard requiredRoles={['superadmin', 'admin']}><SurveyManagementPage /></AuthGuard>} />
        <Route path="/homework-templates" element={<AuthGuard requiredRoles={['superadmin', 'admin']}><HomeworkTemplatesPage /></AuthGuard>} />
        <Route path="/student-profile/:id" element={<StudentProfilePage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </MainLayout>
  );
}

export default AppRouter;
