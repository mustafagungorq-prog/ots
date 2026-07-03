export type UserRole = 'superadmin' | 'admin' | 'authorized_teacher' | 'teacher' | 'parent';

export interface User {
  id: number;
  username: string;
  password: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone: string;
  active: boolean;
  assignedLessons?: number[];
  linkedStudentIds?: number[];
}

export interface Student {
  id: number;
  tcKimlik: string;
  firstName: string;
  lastName: string;
  age: number;
  birthYear: number;
  city: string;
  schoolId: number;
  schoolName?: string;
  grade: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  email: string;
  lessons: number[];
  groupId?: number | null;
  assignedSurveys?: number[];
  createdAt: string;
}

export interface School {
  id: number;
  name: string;
  address: string;
  phone: string;
  principalName: string;
  active?: boolean;
}

export interface Lesson {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
  teacher?: string;
  description?: string;
  active: boolean;
}

export interface Attendance {
  id: number;
  studentId: number;
  lessonId: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  note?: string;
  notes?: string;
  createdBy?: number;
}

export interface Progress {
  id: number;
  studentId: number;
  date: string;
  kuranCurrentPage: number;
  kuranTargetPage?: number;
  kuranPages?: number;
  risaleCurrentPage: number;
  risaleTargetPage?: number;
  risalePages?: number;
  elifbaCurrentPage: number;
  elifbaTargetPage?: number;
  notes: string;
  createdBy?: number;
}

export interface Comment {
  id: number;
  studentId: number;
  author: string;
  content: string;
  type?: 'teacher' | 'parent' | 'homework';
  createdAt: string;
}

export interface HomeworkTemplate {
  id: number;
  title: string;
  content: string;
  details?: string;
  lessonId?: number;
  type?: 'ezber' | 'okuma-kuran' | 'okuma-risale' | 'diger';
  active: boolean;
  createdAt?: string;
}

export interface HomeworkAssignment {
  id: number;
  studentId: number;
  templateId?: number;
  title: string;
  content: string;
  details?: string;
  author: string;
  completed: boolean;
  completedAt?: string;
  createdAt?: string;
  type?: 'ezber' | 'okuma-kuran' | 'okuma-risale' | 'diger';
}

export interface MemorizationText {
  id: number;
  title: string;
  content: string;
  active: boolean;
  createdBy?: number;
  createdByName?: string;
  createdAt?: string;
}

export type MemorizationStatus = 'completed' | 'repeat' | 'not_completed';

export interface MemorizationTracking {
  id: number;
  studentId: number;
  textId: number;
  status: MemorizationStatus;
  teacherNote?: string;
  checkedBy?: number;
  checkedByName?: string;
  checkedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Report {
  id: number;
  title: string;
  recipients: string[];
  sentVia: 'email' | 'sms' | 'both';
  status: 'draft' | 'sent';
  createdAt: string;
}

export interface StudentReport {
  id: number;
  studentId: number;
  reportType: string;
  reportPeriod: string;
  subject: string;
  strengths: string;
  improvements: string;
  recommendations: string;
  attendanceSummary: string;
  lessonData: string;
  notes: string;
  createdAt: string;
}

export interface ClassRoom {
  id: number;
  name: string;
  grade: string;
  schoolId: number;
  description: string;
  lessonIds: number[];
  teacherIds: number[];
  active: boolean;
  createdAt: string;
}

export interface CurriculumTopic {
  id: number;
  category: 'ilmihal' | 'adab' | 'tecvid';
  title: string;
  subTopics: string[];
  active: boolean;
}

export interface LessonLog {
  id: number;
  studentId: number;
  date: string;
  category: 'ilmihal' | 'adab' | 'tecvid';
  topic: string;
  subTopic: string;
  notes: string;
  author: string;
  createdAt: string;
}

export type QuestionType = 'text' | 'select' | 'multiselect' | 'test';

export interface Survey {
  id: number;
  title: string;
  description: string;
  active: boolean;
  createdAt?: string;
}

export interface SurveyQuestion {
  id: number;
  surveyId: number;
  questionText: string;
  type: QuestionType;
  options: string[];
  sortOrder: number;
}

export interface SurveyAnswer {
  id: number;
  studentId: number;
  surveyId: number;
  questionId: number;
  answer: string;
  createdAt?: string;
}

export interface GridColumnPermission {
  gridId: string;
  columnKey: string;
  columnLabel: string;
  allowedRoles: UserRole[];
}

export const DEFAULT_GRID_COLUMN_PERMISSIONS: GridColumnPermission[] = [
  { gridId: 'students', columnKey: 'firstName', columnLabel: 'Ad Soyad', allowedRoles: ['superadmin', 'admin', 'authorized_teacher', 'teacher', 'parent'] },
  { gridId: 'students', columnKey: 'tcKimlik', columnLabel: 'TC Kimlik', allowedRoles: ['superadmin'] },
  { gridId: 'students', columnKey: 'grade', columnLabel: 'Sinif', allowedRoles: ['superadmin', 'admin', 'authorized_teacher', 'teacher', 'parent'] },
  { gridId: 'students', columnKey: 'school', columnLabel: 'Medrese', allowedRoles: ['superadmin', 'admin', 'authorized_teacher'] },
  { gridId: 'students', columnKey: 'group', columnLabel: 'Grup', allowedRoles: ['superadmin', 'admin', 'authorized_teacher', 'teacher'] },
  { gridId: 'students', columnKey: 'age', columnLabel: 'Yas', allowedRoles: ['superadmin', 'admin', 'authorized_teacher', 'teacher', 'parent'] },
  { gridId: 'students', columnKey: 'city', columnLabel: 'Memleket', allowedRoles: ['superadmin', 'admin', 'authorized_teacher', 'teacher', 'parent'] },
  { gridId: 'students', columnKey: 'lessons', columnLabel: 'Dersler', allowedRoles: ['superadmin', 'admin', 'authorized_teacher', 'teacher'] },
  { gridId: 'students', columnKey: 'actions', columnLabel: 'Islem', allowedRoles: ['superadmin', 'admin', 'authorized_teacher'] },
];

export const PERMISSIONS = {
  STUDENT_CREATE: ['superadmin', 'admin', 'authorized_teacher'] as UserRole[],
  STUDENT_EDIT: ['superadmin', 'admin', 'authorized_teacher'] as UserRole[],
  STUDENT_DELETE: ['superadmin', 'admin'] as UserRole[],
  STUDENT_VIEW_TC: ['superadmin'] as UserRole[],
  SCHOOL_MANAGE: ['superadmin', 'admin'] as UserRole[],
  LESSON_MANAGE: ['superadmin', 'admin'] as UserRole[],
  ATTENDANCE_MARK: ['superadmin', 'admin', 'authorized_teacher', 'teacher'] as UserRole[],
  PROGRESS_CREATE: ['superadmin', 'admin', 'authorized_teacher', 'teacher'] as UserRole[],
  COMMENT_CREATE: ['superadmin', 'admin', 'authorized_teacher'] as UserRole[],
  MEMORIZATION_TEXT_MANAGE: ['superadmin', 'admin'] as UserRole[],
  MEMORIZATION_TRACK: ['superadmin', 'admin', 'authorized_teacher', 'teacher'] as UserRole[],
  REPORT_CREATE: ['superadmin', 'admin', 'authorized_teacher'] as UserRole[],
  PERMISSION_MANAGE: ['superadmin'] as UserRole[],
  USER_MANAGE: ['superadmin', 'admin'] as UserRole[],
};
