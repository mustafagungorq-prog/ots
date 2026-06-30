import { useState, useEffect, useCallback } from 'react';
import type { Student, School, Lesson, Attendance, Progress, Comment, CurriculumTopic, LessonLog, ClassRoom } from '@/types';
import { apiGet, apiPost, apiPut, apiDelete } from './useApi';

export function useStudentData() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [curriculumTopics, setCurriculumTopics] = useState<CurriculumTopic[]>([]);
  const [lessonLogs, setLessonLogs] = useState<LessonLog[]>([]);
  const [classRooms, setClassRooms] = useState<ClassRoom[]>([]);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [surveyQuestions, setSurveyQuestions] = useState<any[]>([]);
  const [surveyAnswers, setSurveyAnswers] = useState<any[]>([]);
  const [homeworkTemplates, setHomeworkTemplates] = useState<any[]>([]);
  const [homeworkAssignments, setHomeworkAssignments] = useState<any[]>([]);
  const [studentReports, setStudentReports] = useState<any[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        apiGet<any[]>('students'),
        apiGet<any[]>('schools'),
        apiGet<any[]>('lessons'),
        apiGet<any[]>('attendance'),
        apiGet<any[]>('progress'),
        apiGet<any[]>('comments'),
        apiGet<any[]>('reports'),
        apiGet<any[]>('curriculum-topics'),
        apiGet<any[]>('lesson-logs'),
        apiGet<any[]>('class-rooms'),
        apiGet<any[]>('surveys'),
        apiGet<any[]>('survey-questions'),
        apiGet<any[]>('survey-answers'),
        apiGet<any[]>('homework-templates'),
        apiGet<any[]>('homework-assignments'),
        apiGet<any[]>('student-reports'),
      ]);

      if (results[0].status === 'fulfilled') setStudents(results[0].value.map(ns));
      if (results[1].status === 'fulfilled') setSchools(results[1].value.map(nsc));
      if (results[2].status === 'fulfilled') setLessons(results[2].value.map(nl));
      if (results[3].status === 'fulfilled') setAttendance(results[3].value.map(na));
      if (results[4].status === 'fulfilled') setProgress(results[4].value.map(np));
      if (results[5].status === 'fulfilled') setComments(results[5].value.map(nco));
      if (results[6].status === 'fulfilled') setReports(results[6].value);
      if (results[7].status === 'fulfilled') setCurriculumTopics(results[7].value.map(nct));
      if (results[8].status === 'fulfilled') setLessonLogs(results[8].value.map(nll));
      if (results[9].status === 'fulfilled') setClassRooms(results[9].value.map(ncr));
      if (results[10].status === 'fulfilled') setSurveys(results[10].value);
      if (results[11].status === 'fulfilled') setSurveyQuestions(results[11].value);
      if (results[12].status === 'fulfilled') setSurveyAnswers(results[12].value);
      if (results[13].status === 'fulfilled') setHomeworkTemplates(results[13].value);
      if (results[14].status === 'fulfilled') setHomeworkAssignments(results[14].value);
      if (results[15].status === 'fulfilled') setStudentReports(results[15].value);
    } catch (err) {
      console.error('API load error:', err);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const _api = (fn: () => Promise<any>) => { fn().catch(e => console.error('API error:', e)); };

  // --- Students ---
  const addStudent = (student: Omit<Student, 'id' | 'createdAt'>) => {
    const newId = Date.now();
    const newStudent = { ...student, id: newId, createdAt: new Date().toISOString().split('T')[0] } as Student;
    setStudents(prev => [...prev, newStudent]);
    _api(() => apiPost('students', student).then(() => loadAll()));
    return newStudent;
  };
  const updateStudent = (id: number, data: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    _api(() => apiPut(`students/${id}`, data).then(() => loadAll()));
  };
  const deleteStudent = (id: number) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    _api(() => apiDelete(`students/${id}`).then(() => loadAll()));
  };
  const getStudentLessons = (studentId: number) => {
    const s = students.find(x => x.id === studentId);
    return s ? lessons.filter(l => s.lessons.includes(l.id)) : [];
  };

  // --- Schools ---
  const addSchool = (school: Omit<School, 'id'>) => {
    const newId = Date.now();
    const newSchool = { ...school, id: newId } as School;
    setSchools(prev => [...prev, newSchool]);
    _api(() => apiPost('schools', school).then(() => loadAll()));
    return newSchool;
  };
  const updateSchool = (id: number, data: Partial<School>) => {
    setSchools(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    _api(() => apiPut(`schools/${id}`, data).then(() => loadAll()));
  };
  const deleteSchool = (id: number) => {
    setSchools(prev => prev.filter(s => s.id !== id));
    _api(() => apiDelete(`schools/${id}`).then(() => loadAll()));
  };

  // --- Lessons ---
  const addLesson = (lesson: Omit<Lesson, 'id'>) => {
    const newId = Date.now();
    const newLesson = { ...lesson, id: newId } as Lesson;
    setLessons(prev => [...prev, newLesson]);
    _api(() => apiPost('lessons', lesson).then(() => loadAll()));
    return newLesson;
  };
  const updateLesson = (id: number, data: Partial<Lesson>) => {
    setLessons(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
    _api(() => apiPut(`lessons/${id}`, data).then(() => loadAll()));
  };
  const deleteLesson = (id: number) => {
    setLessons(prev => prev.filter(l => l.id !== id));
    _api(() => apiDelete(`lessons/${id}`).then(() => loadAll()));
  };

  // --- Attendance ---
  const addAttendance = (a: Omit<Attendance, 'id'>) => {
    const newId = Date.now();
    const newA = { ...a, id: newId } as Attendance;
    setAttendance(prev => [...prev, newA]);
    _api(() => apiPost('attendance', a).then(() => loadAll()));
    return newA;
  };
  const updateAttendanceStatus = (id: number, status: string) => {
    setAttendance(prev => prev.map(a => a.id === id ? { ...a, status: status as any } : a));
    _api(() => apiPut(`attendance/${id}`, { status }).then(() => loadAll()));
  };
  const deleteAttendance = (id: number) => {
    setAttendance(prev => prev.filter(a => a.id !== id));
    _api(() => apiDelete(`attendance/${id}`).then(() => loadAll()));
  };

  // --- Progress ---
  const addProgress = (p: Omit<Progress, 'id'>) => {
    const newId = Date.now();
    const newP = { ...p, id: newId } as Progress;
    setProgress(prev => [...prev, newP]);
    _api(() => apiPost('progress', p).then(() => loadAll()));
    return newP;
  };
  const updateProgress = (id: number, data: Partial<Progress>) => {
    setProgress(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    _api(() => apiPut(`progress/${id}`, data).then(() => loadAll()));
  };
  const deleteProgress = (id: number) => {
    setProgress(prev => prev.filter(p => p.id !== id));
    _api(() => apiDelete(`progress/${id}`).then(() => loadAll()));
  };

  // --- Comments ---
  const addComment = (c: Omit<Comment, 'id' | 'createdAt'>) => {
    const newId = Date.now();
    const newC = { ...c, id: newId, createdAt: new Date().toISOString() } as Comment;
    setComments(prev => [...prev, newC]);
    _api(() => apiPost('comments', c).then(() => loadAll()));
    return newC;
  };
  const deleteComment = (id: number) => {
    setComments(prev => prev.filter(c => c.id !== id));
    _api(() => apiDelete(`comments/${id}`).then(() => loadAll()));
  };

  // --- Reports ---
  const addReport = (r: any) => {
    const newId = Date.now();
    const newR = { ...r, id: newId };
    setReports(prev => [...prev, newR]);
    _api(() => apiPost('reports', r).then(() => loadAll()));
    return newR;
  };
  const deleteReport = (id: number) => {
    setReports(prev => prev.filter(r => r.id !== id));
    _api(() => apiDelete(`reports/${id}`).then(() => loadAll()));
  };
  const sendReport = (id: number) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'sent', sentAt: new Date().toISOString() } : r));
  };

  // --- ClassRooms ---
  const addClassRoom = (room: Omit<ClassRoom, 'id' | 'createdAt'>) => {
    const newId = Date.now();
    const newRoom = { ...room, id: newId, createdAt: new Date().toISOString().split('T')[0] } as ClassRoom;
    setClassRooms(prev => [...prev, newRoom]);
    _api(() => apiPost('class-rooms', room).then(() => loadAll()));
    return newRoom;
  };
  const updateClassRoom = (id: number, data: Partial<ClassRoom>) => {
    setClassRooms(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    _api(() => apiPut(`class-rooms/${id}`, data).then(() => loadAll()));
  };
  const deleteClassRoom = (id: number) => {
    setClassRooms(prev => prev.filter(r => r.id !== id));
    _api(() => apiDelete(`class-rooms/${id}`).then(() => loadAll()));
  };
  const getClassRoomLessons = (roomId: number) => {
    const room = classRooms.find(r => r.id === roomId);
    return room ? lessons.filter(l => room.lessonIds.includes(l.id)) : [];
  };
  const getClassRoomStudents = (roomId: number) => {
    const room = classRooms.find(r => r.id === roomId);
    if (!room) return [];
    const byGroupId = students.filter(s => s.groupId === roomId);
    if (byGroupId.length > 0) return byGroupId;
    return students.filter(s => s.schoolId === room.schoolId && s.grade === room.grade);
  };
  const assignLessonToClassRoom = (roomId: number, lessonId: number) => {
    const room = classRooms.find(r => r.id === roomId);
    if (!room || room.lessonIds.includes(lessonId)) return;
    const newIds = [...room.lessonIds, lessonId];
    setClassRooms(prev => prev.map(r => r.id === roomId ? { ...r, lessonIds: newIds } : r));
    _api(() => apiPut(`class-rooms/${roomId}`, { lessonIds: newIds }));
  };
  const unassignLessonFromClassRoom = (roomId: number, lessonId: number) => {
    const room = classRooms.find(r => r.id === roomId);
    if (!room) return;
    const newIds = room.lessonIds.filter(id => id !== lessonId);
    setClassRooms(prev => prev.map(r => r.id === roomId ? { ...r, lessonIds: newIds } : r));
    _api(() => apiPut(`class-rooms/${roomId}`, { lessonIds: newIds }));
  };
  const assignTeacherToClassRoom = (roomId: number, teacherId: number) => {
    const room = classRooms.find(r => r.id === roomId);
    if (!room || room.teacherIds.includes(teacherId)) return;
    const newIds = [...room.teacherIds, teacherId];
    setClassRooms(prev => prev.map(r => r.id === roomId ? { ...r, teacherIds: newIds } : r));
    _api(() => apiPut(`class-rooms/${roomId}`, { teacherIds: newIds }));
  };
  const unassignTeacherFromClassRoom = (roomId: number, teacherId: number) => {
    const room = classRooms.find(r => r.id === roomId);
    if (!room) return;
    const newIds = room.teacherIds.filter(id => id !== teacherId);
    setClassRooms(prev => prev.map(r => r.id === roomId ? { ...r, teacherIds: newIds } : r));
    _api(() => apiPut(`class-rooms/${roomId}`, { teacherIds: newIds }));
  };
  const getTeacherClassRooms = (teacherId: number) => classRooms.filter(r => r.teacherIds.includes(teacherId));

  // --- Curriculum ---
  const addCurriculumTopic = (topic: Omit<CurriculumTopic, 'id'>) => {
    const newId = Date.now();
    const newT = { ...topic, id: newId } as CurriculumTopic;
    setCurriculumTopics(prev => [...prev, newT]);
    _api(() => apiPost('curriculum-topics', topic).then(() => loadAll()));
    return newT;
  };
  const deleteCurriculumTopic = (id: number) => {
    setCurriculumTopics(prev => prev.filter(t => t.id !== id));
    _api(() => apiDelete(`curriculum-topics/${id}`).then(() => loadAll()));
  };

  // --- Lesson Logs ---
  const addLessonLog = (log: Omit<LessonLog, 'id' | 'createdAt'>) => {
    const newId = Date.now();
    const newL = { ...log, id: newId, createdAt: new Date().toISOString() } as LessonLog;
    setLessonLogs(prev => [...prev, newL]);
    _api(() => apiPost('lesson-logs', log).then(() => loadAll()));
    return newL;
  };
  const getStudentLessonLogs = (studentId: number) => lessonLogs.filter(l => l.studentId === studentId);
  const deleteLessonLog = (id: number) => {
    setLessonLogs(prev => prev.filter(l => l.id !== id));
    _api(() => apiDelete(`lesson-logs/${id}`).then(() => loadAll()));
  };

  // --- Surveys ---
  const addSurvey = (s: any) => {
    const newId = Date.now();
    const newS = { ...s, id: newId };
    setSurveys(prev => [...prev, newS]);
    _api(() => apiPost('surveys', s).then(() => loadAll()));
    return newS;
  };
  const updateSurvey = (id: number, data: any) => {
    setSurveys(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    _api(() => apiPut(`surveys/${id}`, data).then(() => loadAll()));
  };
  const deleteSurvey = (id: number) => {
    setSurveys(prev => prev.filter(s => s.id !== id));
    _api(() => apiDelete(`surveys/${id}`).then(() => loadAll()));
  };
  const addSurveyQuestion = (q: any) => {
    const newId = Date.now();
    const newQ = { ...q, id: newId };
    setSurveyQuestions(prev => [...prev, newQ]);
    _api(() => apiPost('survey-questions', q).then(() => loadAll()));
    return newQ;
  };
  const deleteSurveyQuestion = (id: number) => {
    setSurveyQuestions(prev => prev.filter(q => q.id !== id));
    _api(() => apiDelete(`survey-questions/${id}`).then(() => loadAll()));
  };
  const getSurveyQuestions = (surveyId: number) => surveyQuestions.filter(q => q.surveyId === surveyId || q.survey_id === surveyId);
  const addSurveyAnswer = (a: any) => {
    const newId = Date.now();
    const newA = { ...a, id: newId };
    setSurveyAnswers(prev => [...prev, newA]);
    _api(() => apiPost('survey-answers', a).then(() => loadAll()));
    return newA;
  };
  const deleteSurveyAnswer = (id: number) => {
    setSurveyAnswers(prev => prev.filter(a => a.id !== id));
    _api(() => apiDelete(`survey-answers/${id}`).then(() => loadAll()));
  };

  // --- Homework ---
  const addHomeworkTemplate = (t: any) => {
    const newId = Date.now();
    const newT = { ...t, id: newId };
    setHomeworkTemplates(prev => [...prev, newT]);
    _api(() => apiPost('homework-templates', t).then(() => loadAll()));
    return newT;
  };
  const updateHomeworkTemplate = (id: number, data: any) => {
    setHomeworkTemplates(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    _api(() => apiPut(`homework-templates/${id}`, data).then(() => loadAll()));
  };
  const deleteHomeworkTemplate = (id: number) => {
    setHomeworkTemplates(prev => prev.filter(t => t.id !== id));
    _api(() => apiDelete(`homework-templates/${id}`).then(() => loadAll()));
  };
  const addHomeworkAssignment = (a: any) => {
    const newId = Date.now();
    const newA = { ...a, id: newId };
    setHomeworkAssignments(prev => [...prev, newA]);
    _api(() => apiPost('homework-assignments', a).then(() => loadAll()));
    return newA;
  };
  const getStudentHomeworks = (studentId: number) => homeworkAssignments.filter(a => a.studentId === studentId || a.student_id === studentId);
  const toggleHomeworkCompleted = (id: number) => {
    const a = homeworkAssignments.find(x => x.id === id);
    if (!a) return;
    setHomeworkAssignments(prev => prev.map(h => h.id === id ? { ...h, completed: !h.completed } : h));
    _api(() => apiPut(`homework-assignments/${id}`, { completed: !a.completed }));
  };
  const deleteHomeworkAssignment = (id: number) => {
    setHomeworkAssignments(prev => prev.filter(a => a.id !== id));
    _api(() => apiDelete(`homework-assignments/${id}`).then(() => loadAll()));
  };

  // --- Student Reports ---
  const addStudentReport = (r: any) => {
    const newId = Date.now();
    const newR = { ...r, id: newId };
    setStudentReports(prev => [...prev, newR]);
    _api(() => apiPost('student-reports', r).then(() => loadAll()));
    return newR;
  };
  const getStudentReports = (studentId: number) => studentReports.filter(r => r.student_id === studentId || r.studentId === studentId);
  const deleteStudentReport = (id: number) => {
    setStudentReports(prev => prev.filter(r => r.id !== id));
    _api(() => apiDelete(`student-reports/${id}`).then(() => loadAll()));
  };

  return {
    initialized, loading,
    students, schools, lessons, attendance, progress, comments, reports,
    surveys, surveyQuestions, surveyAnswers,
    curriculumTopics, lessonLogs, classRooms,
    homeworkTemplates, homeworkAssignments,
    studentReports,
    refresh: loadAll,
    addStudent, updateStudent, deleteStudent, getStudentLessons,
    addSchool, updateSchool, deleteSchool,
    addLesson, updateLesson, deleteLesson,
    addAttendance, updateAttendanceStatus, deleteAttendance,
    addProgress, updateProgress, deleteProgress,
    addComment, deleteComment,
    addReport, deleteReport, sendReport,
    addClassRoom, updateClassRoom, deleteClassRoom,
    getClassRoomLessons, getClassRoomStudents,
    assignLessonToClassRoom, unassignLessonFromClassRoom,
    assignTeacherToClassRoom, unassignTeacherFromClassRoom, getTeacherClassRooms,
    addCurriculumTopic, deleteCurriculumTopic,
    addLessonLog, getStudentLessonLogs, deleteLessonLog,
    addSurvey, updateSurvey, deleteSurvey,
    addSurveyQuestion, deleteSurveyQuestion, getSurveyQuestions,
    addSurveyAnswer, deleteSurveyAnswer,
    addHomeworkTemplate, updateHomeworkTemplate, deleteHomeworkTemplate,
    addHomeworkAssignment, getStudentHomeworks, toggleHomeworkCompleted, deleteHomeworkAssignment,
    addStudentReport, getStudentReports, deleteStudentReport,
  };
}

// ================================================================
// Normalizers (DB snake_case -> JS camelCase)
// ================================================================
function ns(r: any): Student {
  return {
    id: r.id, tcKimlik: r.tc_kimlik || '', firstName: r.first_name || '', lastName: r.last_name || '',
    age: r.age || 0, birthYear: r.birth_year || 0, city: r.city || '',
    schoolId: r.school_id || 0, schoolName: r.school_name || '', grade: r.grade || '',
    phone: r.phone || '', parentName: r.parent_name || '', parentPhone: r.parent_phone || '', email: r.email || '',
    lessons: safeJson(r.lessons), groupId: r.group_id || undefined,
    assignedSurveys: safeJson(r.assigned_surveys), createdAt: r.created_at || '',
  };
}
function nsc(r: any): School {
  return { id: r.id, name: r.name || '', address: r.address || '', phone: r.phone || '', principalName: r.principal_name || '', active: r.active !== false };
}
function nl(r: any): Lesson {
  return { id: r.id, name: r.name || '', startTime: r.start_time || '', endTime: r.end_time || '', dayOfWeek: r.day_of_week || '', teacher: r.teacher_name || '', active: r.active !== false };
}
function na(r: any): Attendance {
  return { id: r.id, studentId: r.student_id, lessonId: r.lesson_id || 0, date: r.date || '', status: r.status || 'present', notes: r.notes || '', createdBy: r.created_by };
}
function np(r: any): Progress {
  return {
    id: r.id, studentId: r.student_id, date: r.date || '',
    kuranCurrentPage: r.kuran_current_page || 0, kuranTargetPage: r.kuran_target_page || 0,
    risaleCurrentPage: r.risale_current_page || 0, risaleTargetPage: r.risale_target_page || 0,
    elifbaCurrentPage: r.elifba_current_page || 0, elifbaTargetPage: r.elifba_target_page || 0,
    notes: r.notes || '', createdBy: r.created_by,
  };
}
function nco(r: any): Comment {
  return { id: r.id, studentId: r.student_id, author: r.author || '', content: r.content || '', createdAt: r.created_at || '' };
}
function nct(r: any): CurriculumTopic {
  return { id: r.id, category: r.category, title: r.title || '', subTopics: safeJson(r.sub_topics), active: r.active !== false };
}
function nll(r: any): LessonLog {
  return { id: r.id, studentId: r.student_id, date: r.date || '', category: r.category, topic: r.topic || '', subTopic: r.sub_topic || '', notes: r.notes || '', author: r.author || '', createdAt: r.created_at || '' };
}
function ncr(r: any): ClassRoom {
  return {
    id: r.id, name: r.name || '', grade: r.grade || '', schoolId: r.school_id || 0,
    description: r.description || '', lessonIds: safeJson(r.lesson_ids), teacherIds: safeJson(r.teacher_ids),
    active: r.active !== false, createdAt: r.created_at || '',
  };
}
function safeJson(v: any): any[] {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v || '[]'); } catch { return []; }
}
