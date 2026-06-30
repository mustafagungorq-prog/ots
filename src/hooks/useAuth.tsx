import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, GridColumnPermission, UserRole } from '@/types';
import { DEFAULT_GRID_COLUMN_PERMISSIONS } from '@/types';
import { apiGet, apiPost, apiPut } from './useApi';

const SESSION_KEY = 'ots_session';
const SESSION_ACTIVITY_KEY = 'ots_activity';
const SESSION_DURATION = 30 * 60 * 1000;

export interface PermissionMatrixEntry {
  id: string;
  label: string;
  superadmin: boolean;
  admin: boolean;
  authorized_teacher: boolean;
  teacher: boolean;
  parent: boolean;
}

const DEFAULT_PERMISSION_MATRIX: PermissionMatrixEntry[] = [
  { id: 'student_create', label: 'Ogrenci Ekleme', superadmin: true, admin: true, authorized_teacher: true, teacher: false, parent: false },
  { id: 'student_edit', label: 'Ogrenci Duzenleme', superadmin: true, admin: true, authorized_teacher: true, teacher: false, parent: false },
  { id: 'student_delete', label: 'Ogrenci Silme', superadmin: true, admin: true, authorized_teacher: false, teacher: false, parent: false },
  { id: 'student_view_tc', label: 'TC Kimlik Goruntuleme', superadmin: true, admin: false, authorized_teacher: false, teacher: false, parent: false },
  { id: 'school_manage', label: 'Medrese Yonetimi', superadmin: true, admin: true, authorized_teacher: false, teacher: false, parent: false },
  { id: 'lesson_manage', label: 'Ders Yonetimi', superadmin: true, admin: true, authorized_teacher: false, teacher: false, parent: false },
  { id: 'attendance_mark', label: 'Yoklama Isleme', superadmin: true, admin: true, authorized_teacher: true, teacher: true, parent: false },
  { id: 'progress_create', label: 'Gelisim Girisi', superadmin: true, admin: true, authorized_teacher: true, teacher: true, parent: false },
  { id: 'comment_create', label: 'Yorum Olusturma', superadmin: true, admin: true, authorized_teacher: true, teacher: false, parent: false },
  { id: 'report_create', label: 'Rapor Olusturma', superadmin: true, admin: true, authorized_teacher: true, teacher: false, parent: false },
  { id: 'permission_manage', label: 'Yetki Yonetimi', superadmin: true, admin: false, authorized_teacher: false, teacher: false, parent: false },
  { id: 'user_manage', label: 'Kullanici Yonetimi', superadmin: true, admin: true, authorized_teacher: false, teacher: false, parent: false },
];

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (allowedRoles: readonly string[]) => boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewTC: boolean;
  canManageSchool: boolean;
  canManageLesson: boolean;
  canMarkAttendance: boolean;
  canCreateProgress: boolean;
  canCreateComment: boolean;
  canCreateReport: boolean;
  canManagePermission: boolean;
  canManageUser: boolean;
  isAuthorizedTeacher: boolean;
  isNormalTeacher: boolean;
  canViewColumn: (gridId: string, columnKey: string) => boolean;
  initialized: boolean;
  sessionExpired: boolean;
  clearSessionExpired: () => void;
  loading: boolean;
  error: string | null;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: number, data: Partial<User>) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
  changePassword: (userId: number, newPassword: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
  teacherLessons: { teacherId: number; lessonId: number }[];
  assignLessonToTeacher: (teacherId: number, lessonId: number) => Promise<void>;
  unassignLessonFromTeacher: (teacherId: number, lessonId: number) => Promise<void>;
  getAssignedLessons: (teacherId: number) => number[];
  refreshTeacherLessons: () => Promise<void>;
  getColumnsForGrid: (gridId: string) => GridColumnPermission[];
  updateGridColumnPermission: (gridId: string, columnKey: string, allowedRoles: UserRole[]) => void;
  resetGridColumnsToDefaults: () => void;
  permissionMatrix: PermissionMatrixEntry[];
  updatePermissionMatrixEntry: (entryId: string, role: UserRole, value: boolean) => void;
  resetPermissionMatrix: () => void;
  hasMatrixPermission: (entryId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getLastActivity(): number {
  try { return Number(sessionStorage.getItem(SESSION_ACTIVITY_KEY)) || Date.now(); } catch { return Date.now(); }
}
function updateLastActivity() { sessionStorage.setItem(SESSION_ACTIVITY_KEY, String(Date.now())); }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [teacherLessons, setTeacherLessons] = useState<{ teacherId: number; lessonId: number }[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gridColumnPermissions, setGridColumnPermissions] = useState<GridColumnPermission[]>(DEFAULT_GRID_COLUMN_PERMISSIONS);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrixEntry[]>(DEFAULT_PERMISSION_MATRIX);

  useEffect(() => {
    const token = localStorage.getItem('ots_token');
    if (!token) { setInitialized(true); return; }
    apiGet<{ user: User }>('auth/me')
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user);
          refreshUsers();
          refreshTeacherLessons();
        }
      })
      .catch(() => { localStorage.removeItem('ots_token'); })
      .finally(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    updateLastActivity();
    const iv = setInterval(() => {
      if (Date.now() - getLastActivity() > SESSION_DURATION) {
        setSessionExpired(true);
        logout();
      }
    }, 60000);
    const onAct = () => updateLastActivity();
    window.addEventListener('click', onAct);
    window.addEventListener('keydown', onAct);
    return () => { clearInterval(iv); window.removeEventListener('click', onAct); window.removeEventListener('keydown', onAct); };
  }, [currentUser]);

  const refreshUsers = useCallback(async () => {
    try { const d = await apiGet<User[]>('users'); setUsers(d); } catch { /* */ }
  }, []);

  const refreshTeacherLessons = useCallback(async () => {
    try { const d = await apiGet<any[]>('teacher-lessons'); setTeacherLessons(d.map(t => ({ teacherId: t.teacher_id, lessonId: t.lesson_id }))); } catch { setTeacherLessons([]); }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<{ token: string; user: User }>('auth/login', { username, password });
      if (data.token && data.user) {
        localStorage.setItem('ots_token', data.token);
        setCurrentUser(data.user);
        updateLastActivity();
        await refreshUsers();
        await refreshTeacherLessons();
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshUsers, refreshTeacherLessons]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setUsers([]);
    setTeacherLessons([]);
    localStorage.removeItem('ots_token');
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_ACTIVITY_KEY);
  }, []);

  const hasPermission = useCallback((allowedRoles: readonly string[]): boolean => {
    if (!currentUser) return false;
    return allowedRoles.includes(currentUser.role);
  }, [currentUser]);

  const isAuthorizedTeacher = currentUser?.role === 'authorized_teacher';
  const isNormalTeacher = currentUser?.role === 'teacher';

  const addUser = useCallback(async (user: Omit<User, 'id'>) => {
    await apiPost('users', user);
    await refreshUsers();
  }, [refreshUsers]);

  const updateUser = useCallback(async (id: number, data: Partial<User>) => {
    await apiPut(`users/${id}`, data);
    await refreshUsers();
  }, [refreshUsers]);

  const deleteUser = useCallback(async (id: number) => {
    await apiDelete(`users/${id}`);
    await refreshUsers();
  }, [refreshUsers]);

  const changePassword = useCallback(async (userId: number, newPassword: string) => {
    await apiPut(`users/${userId}`, { password: newPassword });
  }, []);

  const assignLessonToTeacher = useCallback(async (teacherId: number, lessonId: number) => {
    await apiPost('teacher-lessons', { teacherId, lessonId });
    await refreshTeacherLessons();
  }, [refreshTeacherLessons]);

  const unassignLessonFromTeacher = useCallback(async (teacherId: number, lessonId: number) => {
    const record = teacherLessons.find(t => t.teacherId === teacherId && t.lessonId === lessonId);
    if (record) {
      await apiDelete(`teacher-lessons/${(record as any).id || 0}`);
      await refreshTeacherLessons();
    }
  }, [teacherLessons, refreshTeacherLessons]);

  const getAssignedLessons = useCallback((teacherId: number): number[] => {
    return teacherLessons.filter(a => a.teacherId === teacherId).map(a => a.lessonId);
  }, [teacherLessons]);

  const getColumnsForGrid = useCallback((gridId: string): GridColumnPermission[] => {
    return gridColumnPermissions.filter(p => p.gridId === gridId);
  }, [gridColumnPermissions]);

  const updateGridColumnPermission = useCallback((gridId: string, columnKey: string, allowedRoles: UserRole[]) => {
    setGridColumnPermissions(prev => prev.map(p => p.gridId === gridId && p.columnKey === columnKey ? { ...p, allowedRoles } : p));
  }, []);

  const resetGridColumnsToDefaults = useCallback(() => setGridColumnPermissions(DEFAULT_GRID_COLUMN_PERMISSIONS), []);

  const updatePermissionMatrixEntry = useCallback((entryId: string, role: UserRole, value: boolean) => {
    setPermissionMatrix(prev => prev.map(e => e.id === entryId ? { ...e, [role]: value } : e));
  }, []);

  const resetPermissionMatrix = useCallback(() => {
    setPermissionMatrix(DEFAULT_PERMISSION_MATRIX.map(entry => ({ ...entry })));
  }, []);

  const hasMatrixPermission = useCallback((entryId: string): boolean => {
    if (!currentUser) return false;
    const entry = permissionMatrix.find(e => e.id === entryId);
    if (!entry) return false;
    return entry[currentUser.role as keyof PermissionMatrixEntry] === true;
  }, [currentUser, permissionMatrix]);

  const canViewColumn = useCallback((gridId: string, columnKey: string): boolean => {
    const permissions: Record<string, Record<string, string[]>> = {
      students: { firstName: ['superadmin','admin','authorized_teacher','teacher','parent'], tcKimlik: ['superadmin'], grade: ['superadmin','admin','authorized_teacher','teacher','parent'], school: ['superadmin','admin','authorized_teacher'], group: ['superadmin','admin','authorized_teacher','teacher'], age: ['superadmin','admin','authorized_teacher','teacher','parent'], city: ['superadmin','admin','authorized_teacher','teacher','parent'], phone: ['superadmin','admin','authorized_teacher','teacher','parent'], parentName: ['superadmin','admin','authorized_teacher','teacher'], parentPhone: ['superadmin','admin','authorized_teacher'], email: ['superadmin','admin','authorized_teacher'], lessons: ['superadmin','admin','authorized_teacher','teacher'], actions: ['superadmin','admin','authorized_teacher'] },
      schools: { name: ['superadmin','admin','authorized_teacher'], address: ['superadmin','admin'], phone: ['superadmin','admin'], principal: ['superadmin','admin'], actions: ['superadmin','admin'] },
      lessons: { name: ['superadmin','admin','authorized_teacher','teacher'], day: ['superadmin','admin','teacher'], time: ['superadmin','admin','teacher'], actions: ['superadmin','admin'] },
      attendance: { student: ['superadmin','admin','authorized_teacher','teacher'], lesson: ['superadmin','admin','teacher'], date: ['superadmin','admin','teacher'], status: ['superadmin','admin','teacher'], actions: ['superadmin','admin'] },
      progress: { student: ['superadmin','admin','authorized_teacher','teacher','parent'], date: ['superadmin','admin','teacher','parent'], kuran: ['superadmin','admin','authorized_teacher','teacher','parent'], risale: ['superadmin','admin','teacher','parent'], elifba: ['superadmin','admin','teacher','parent'], notes: ['superadmin','admin','authorized_teacher','teacher'] },
      comments: { student: ['superadmin','admin','authorized_teacher','teacher','parent'], content: ['superadmin','admin','authorized_teacher','teacher','parent'], author: ['superadmin','admin','teacher','parent'], date: ['superadmin','admin','teacher','parent'] },
    };
    const allowed = permissions[gridId]?.[columnKey];
    if (!allowed) return true;
    return currentUser ? allowed.includes(currentUser.role) : false;
  }, [currentUser]);

  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

  return (
    <AuthContext.Provider value={{
      currentUser, users, login, logout, hasPermission,
      canCreate: hasPermission(['superadmin','admin','authorized_teacher']),
      canEdit: hasPermission(['superadmin','admin','authorized_teacher']),
      canDelete: hasPermission(['superadmin','admin']),
      canViewTC: hasPermission(['superadmin']),
      canManageSchool: hasPermission(['superadmin','admin']),
      canManageLesson: hasPermission(['superadmin','admin']),
      canMarkAttendance: hasPermission(['superadmin','admin','authorized_teacher','teacher']),
      canCreateProgress: hasPermission(['superadmin','admin','authorized_teacher','teacher']),
      canCreateComment: hasPermission(['superadmin','admin','authorized_teacher']),
      canCreateReport: hasPermission(['superadmin','admin','authorized_teacher']),
      canManagePermission: hasPermission(['superadmin']),
      canManageUser: hasPermission(['superadmin','admin']),
      isAuthorizedTeacher, isNormalTeacher,
      canViewColumn,
      initialized, sessionExpired, clearSessionExpired, loading, error,
      addUser, updateUser, deleteUser, changePassword, refreshUsers,
      teacherLessons, assignLessonToTeacher, unassignLessonFromTeacher, getAssignedLessons, refreshTeacherLessons,
      getColumnsForGrid, updateGridColumnPermission, resetGridColumnsToDefaults,
      permissionMatrix, updatePermissionMatrixEntry, resetPermissionMatrix, hasMatrixPermission,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

async function apiDelete<T>(path: string): Promise<T> {
  const token = localStorage.getItem('ots_token');
  const res = await fetch(`/api/${path}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}
