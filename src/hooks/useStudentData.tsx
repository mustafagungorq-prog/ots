import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import type {
  Student,
  School,
  Course,
  CourseSchedule,
  Attendance,
  Progress,
  Comment,
  CurriculumTopic,
  LessonLog,
  ClassRoom,
  MemorizationText,
  MemorizationTracking,
  MemorizationStatus,
  MemorizationCriteria,
  MemorizationSummary,
} from '@/types';
import { apiGet, apiPost, apiPut, apiDelete } from './useApi';

function useStudentDataInternal() {
  // --- Loading flags ---
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingCourseSchedules, setLoadingCourseSchedules] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingCurriculumTopics, setLoadingCurriculumTopics] = useState(false);
  const [loadingLessonLogs, setLoadingLessonLogs] = useState(false);
  const [loadingClassRooms, setLoadingClassRooms] = useState(false);
  const [loadingSurveys, setLoadingSurveys] = useState(false);
  const [loadingSurveyQuestions, setLoadingSurveyQuestions] = useState(false);
  const [loadingSurveyAnswers, setLoadingSurveyAnswers] = useState(false);
  const [loadingHomeworkTemplates, setLoadingHomeworkTemplates] = useState(false);
  const [loadingHomeworkAssignments, setLoadingHomeworkAssignments] = useState(false);
  const [loadingStudentReports, setLoadingStudentReports] = useState(false);
  const [loadingMemorizationTexts, setLoadingMemorizationTexts] = useState(false);
  const [loadingMemorizationTracking, setLoadingMemorizationTracking] = useState(false);
  const [loadingMemorizationCriteria, setLoadingMemorizationCriteria] = useState(false);
  const [loadingMemorizationSummary, setLoadingMemorizationSummary] = useState(false);
  const [loadingParentStudentLinks, setLoadingParentStudentLinks] = useState(false);

  // --- Loaded flags (cache) ---
  const [loadedStudents, setLoadedStudents] = useState(false);
  const [loadedSchools, setLoadedSchools] = useState(false);
  const [loadedLessons, setLoadedLessons] = useState(false);
  const [loadedCourseSchedules, setLoadedCourseSchedules] = useState(false);
  const [loadedAttendance, setLoadedAttendance] = useState(false);
  const [loadedProgress, setLoadedProgress] = useState(false);
  const [loadedComments, setLoadedComments] = useState(false);
  const [loadedReports, setLoadedReports] = useState(false);
  const [loadedCurriculumTopics, setLoadedCurriculumTopics] = useState(false);
  const [loadedLessonLogs, setLoadedLessonLogs] = useState(false);
  const [loadedClassRooms, setLoadedClassRooms] = useState(false);
  const [loadedSurveys, setLoadedSurveys] = useState(false);
  const [loadedSurveyQuestions, setLoadedSurveyQuestions] = useState(false);
  const [loadedSurveyAnswers, setLoadedSurveyAnswers] = useState(false);
  const [loadedHomeworkTemplates, setLoadedHomeworkTemplates] = useState(false);
  const [loadedHomeworkAssignments, setLoadedHomeworkAssignments] = useState(false);
  const [loadedStudentReports, setLoadedStudentReports] = useState(false);
  const [loadedMemorizationTexts, setLoadedMemorizationTexts] = useState(false);
  const [loadedMemorizationTracking, setLoadedMemorizationTracking] = useState(false);
  const [loadedMemorizationCriteria, setLoadedMemorizationCriteria] = useState(false);
  const [loadedParentStudentLinks, setLoadedParentStudentLinks] = useState(false);

  // --- Data states ---
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [lessons, setLessons] = useState<Course[]>([]);
  const [courseSchedules, setCourseSchedules] = useState<CourseSchedule[]>([]);
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
  const [memorizationTexts, setMemorizationTexts] = useState<MemorizationText[]>([]);
  const [memorizationTracking, setMemorizationTracking] = useState<MemorizationTracking[]>([]);
  const [memorizationCriteria, setMemorizationCriteria] = useState<MemorizationCriteria[]>([]);
  const [memorizationSummaries, setMemorizationSummaries] = useState<Record<number, MemorizationSummary>>({});
  const [parentStudentLinks, setParentStudentLinks] = useState<{ parentUserId: number; studentId: number }[]>([]);

  // --- Loaders ---
  const loadStudents = useCallback(async (force = false) => {
    if (loadedStudents && !force) return;
    setLoadingStudents(true);
    try {
      const value = await apiGet<any[]>('students');
      setStudents(value.map(ns));
      setLoadedStudents(true);
    } catch (err) { console.error('loadStudents error:', err); }
    finally { setLoadingStudents(false); }
  }, [loadedStudents]);

  const loadSchools = useCallback(async (force = false) => {
    if (loadedSchools && !force) return;
    setLoadingSchools(true);
    try {
      const value = await apiGet<any[]>('schools');
      setSchools(value.map(nsc));
      setLoadedSchools(true);
    } catch (err) { console.error('loadSchools error:', err); }
    finally { setLoadingSchools(false); }
  }, [loadedSchools]);

  const loadLessons = useCallback(async (force = false) => {
    if (loadedLessons && !force) return;
    setLoadingLessons(true);
    try {
      const value = await apiGet<any[]>('courses');
      setLessons(value.map(nc));
      setLoadedLessons(true);
    } catch (err) { console.error('loadLessons error:', err); }
    finally { setLoadingLessons(false); }
  }, [loadedLessons]);

  const loadCourseSchedules = useCallback(async (force = false) => {
    if (loadedCourseSchedules && !force) return;
    setLoadingCourseSchedules(true);
    try {
      const value = await apiGet<any[]>('course-schedules');
      setCourseSchedules(value.map(nl));
      setLoadedCourseSchedules(true);
    } catch (err) { console.error('loadCourseSchedules error:', err); }
    finally { setLoadingCourseSchedules(false); }
  }, [loadedCourseSchedules]);

  const loadAttendance = useCallback(async (force = false) => {
    if (loadedAttendance && !force) return;
    setLoadingAttendance(true);
    try {
      const value = await apiGet<any[]>('attendance');
      setAttendance(value.map(na));
      setLoadedAttendance(true);
    } catch (err) { console.error('loadAttendance error:', err); }
    finally { setLoadingAttendance(false); }
  }, [loadedAttendance]);

  const loadProgress = useCallback(async (force = false) => {
    if (loadedProgress && !force) return;
    setLoadingProgress(true);
    try {
      const value = await apiGet<any[]>('progress');
      setProgress(value.map(np));
      setLoadedProgress(true);
    } catch (err) { console.error('loadProgress error:', err); }
    finally { setLoadingProgress(false); }
  }, [loadedProgress]);

  const loadComments = useCallback(async (force = false) => {
    if (loadedComments && !force) return;
    setLoadingComments(true);
    try {
      const value = await apiGet<any[]>('comments');
      setComments(value.map(nco));
      setLoadedComments(true);
    } catch (err) { console.error('loadComments error:', err); }
    finally { setLoadingComments(false); }
  }, [loadedComments]);

  const loadReports = useCallback(async (force = false) => {
    if (loadedReports && !force) return;
    setLoadingReports(true);
    try {
      const value = await apiGet<any[]>('reports');
      setReports(value);
      setLoadedReports(true);
    } catch (err) { console.error('loadReports error:', err); }
    finally { setLoadingReports(false); }
  }, [loadedReports]);

  const loadCurriculumTopics = useCallback(async (force = false) => {
    if (loadedCurriculumTopics && !force) return;
    setLoadingCurriculumTopics(true);
    try {
      const value = await apiGet<any[]>('curriculum-topics');
      setCurriculumTopics(value.map(nct));
      setLoadedCurriculumTopics(true);
    } catch (err) { console.error('loadCurriculumTopics error:', err); }
    finally { setLoadingCurriculumTopics(false); }
  }, [loadedCurriculumTopics]);

  const loadLessonLogs = useCallback(async (force = false) => {
    if (loadedLessonLogs && !force) return;
    setLoadingLessonLogs(true);
    try {
      const value = await apiGet<any[]>('lesson-logs');
      setLessonLogs(value.map(nll));
      setLoadedLessonLogs(true);
    } catch (err) { console.error('loadLessonLogs error:', err); }
    finally { setLoadingLessonLogs(false); }
  }, [loadedLessonLogs]);

  const loadClassRooms = useCallback(async (force = false) => {
    if (loadedClassRooms && !force) return;
    setLoadingClassRooms(true);
    try {
      const value = await apiGet<any[]>('class-rooms');
      setClassRooms(value.map(ncr));
      setLoadedClassRooms(true);
    } catch (err) { console.error('loadClassRooms error:', err); }
    finally { setLoadingClassRooms(false); }
  }, [loadedClassRooms]);

  const loadSurveys = useCallback(async (force = false) => {
    if (loadedSurveys && !force) return;
    setLoadingSurveys(true);
    try {
      const value = await apiGet<any[]>('surveys');
      setSurveys(value);
      setLoadedSurveys(true);
    } catch (err) { console.error('loadSurveys error:', err); }
    finally { setLoadingSurveys(false); }
  }, [loadedSurveys]);

  const loadSurveyQuestions = useCallback(async (force = false) => {
    if (loadedSurveyQuestions && !force) return;
    setLoadingSurveyQuestions(true);
    try {
      const value = await apiGet<any[]>('survey-questions');
      setSurveyQuestions(value.map(nsq));
      setLoadedSurveyQuestions(true);
    } catch (err) { console.error('loadSurveyQuestions error:', err); }
    finally { setLoadingSurveyQuestions(false); }
  }, [loadedSurveyQuestions]);

  const loadSurveyAnswers = useCallback(async (force = false) => {
    if (loadedSurveyAnswers && !force) return;
    setLoadingSurveyAnswers(true);
    try {
      const value = await apiGet<any[]>('survey-answers');
      setSurveyAnswers(value.map(nsa));
      setLoadedSurveyAnswers(true);
    } catch (err) { console.error('loadSurveyAnswers error:', err); }
    finally { setLoadingSurveyAnswers(false); }
  }, [loadedSurveyAnswers]);

  const loadHomeworkTemplates = useCallback(async (force = false) => {
    if (loadedHomeworkTemplates && !force) return;
    setLoadingHomeworkTemplates(true);
    try {
      const value = await apiGet<any[]>('homework-templates');
      setHomeworkTemplates(value);
      setLoadedHomeworkTemplates(true);
    } catch (err) { console.error('loadHomeworkTemplates error:', err); }
    finally { setLoadingHomeworkTemplates(false); }
  }, [loadedHomeworkTemplates]);

  const loadHomeworkAssignments = useCallback(async (force = false) => {
    if (loadedHomeworkAssignments && !force) return;
    setLoadingHomeworkAssignments(true);
    try {
      const value = await apiGet<any[]>('homework-assignments');
      setHomeworkAssignments(value);
      setLoadedHomeworkAssignments(true);
    } catch (err) { console.error('loadHomeworkAssignments error:', err); }
    finally { setLoadingHomeworkAssignments(false); }
  }, [loadedHomeworkAssignments]);

  const loadStudentReports = useCallback(async (force = false) => {
    if (loadedStudentReports && !force) return;
    setLoadingStudentReports(true);
    try {
      const value = await apiGet<any[]>('student-reports');
      setStudentReports(value);
      setLoadedStudentReports(true);
    } catch (err) { console.error('loadStudentReports error:', err); }
    finally { setLoadingStudentReports(false); }
  }, [loadedStudentReports]);

  const loadMemorizationTexts = useCallback(async (force = false) => {
    if (loadedMemorizationTexts && !force) return;
    setLoadingMemorizationTexts(true);
    try {
      const value = await apiGet<any[]>('memorization-texts');
      setMemorizationTexts(value.map(nmt));
      setLoadedMemorizationTexts(true);
    } catch (err) { console.error('loadMemorizationTexts error:', err); }
    finally { setLoadingMemorizationTexts(false); }
  }, [loadedMemorizationTexts]);

  const loadMemorizationTracking = useCallback(async (force = false) => {
    if (loadedMemorizationTracking && !force) return;
    setLoadingMemorizationTracking(true);
    try {
      const value = await apiGet<any[]>('memorization-tracking');
      setMemorizationTracking(value.map(nmtr));
      setLoadedMemorizationTracking(true);
    } catch (err) { console.error('loadMemorizationTracking error:', err); }
    finally { setLoadingMemorizationTracking(false); }
  }, [loadedMemorizationTracking]);

  const loadMemorizationCriteria = useCallback(async (force = false) => {
    if (loadedMemorizationCriteria && !force) return;
    setLoadingMemorizationCriteria(true);
    try {
      const value = await apiGet<any[]>('memorization-criteria');
      setMemorizationCriteria(value.map(nmc));
      setLoadedMemorizationCriteria(true);
    } catch (err) { console.error('loadMemorizationCriteria error:', err); }
    finally { setLoadingMemorizationCriteria(false); }
  }, [loadedMemorizationCriteria]);

  const loadMemorizationSummary = useCallback(async (studentId: number, force = false) => {
    if (memorizationSummaries[studentId] && !force) return;
    setLoadingMemorizationSummary(true);
    try {
      const value = await apiGet<MemorizationSummary>(`memorization-tracking/summary?studentId=${studentId}`);
      setMemorizationSummaries(prev => ({ ...prev, [studentId]: value }));
    } catch (err) { console.error('loadMemorizationSummary error:', err); }
    finally { setLoadingMemorizationSummary(false); }
  }, [memorizationSummaries]);

  const loadParentStudentLinks = useCallback(async (force = false) => {
    if (loadedParentStudentLinks && !force) return;
    setLoadingParentStudentLinks(true);
    try {
      const value = await apiGet<any[]>('parent-student-links');
      setParentStudentLinks(value.map((l: any) => ({
        parentUserId: Number(l.parent_user_id ?? l.parentUserId),
        studentId: Number(l.student_id ?? l.studentId),
      })));
      setLoadedParentStudentLinks(true);
    } catch (err) { console.error('loadParentStudentLinks error:', err); }
    finally { setLoadingParentStudentLinks(false); }
  }, [loadedParentStudentLinks]);

  const _api = (fn: () => Promise<any>) => { fn().catch(e => console.error('API error:', e)); };

  // --- Students ---
  const addStudent = (student: Omit<Student, 'id' | 'createdAt'>) => {
    const newId = Date.now();
    const newStudent = { ...student, id: newId, createdAt: new Date().toISOString().split('T')[0] } as Student;
    setStudents(prev => [...prev, newStudent]);
    _api(() => apiPost('students', student).then(() => loadStudents(true)));
    return newStudent;
  };
  const updateStudent = (id: number, data: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    _api(() => apiPut(`students/${id}`, data).then(() => loadStudents(true)));
  };
  const assignCourseToStudents = (courseId: number, studentIds: number[]) => {
    // Optimistically mark selected students as enrolled in the course.
    setStudents(prev => prev.map(s => studentIds.includes(s.id) && !s.lessons.includes(courseId)
      ? { ...s, lessons: [...s.lessons, courseId] }
      : s));
    _api(() => apiPost('student-course-assignments', { courseId, studentIds }).then(() => loadStudents(true)));
  };
  const deleteStudent = (id: number) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    _api(() => apiDelete(`students/${id}`).then(() => loadStudents(true)));
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
    _api(() => apiPost('schools', school).then(() => loadSchools(true)));
    return newSchool;
  };
  const updateSchool = (id: number, data: Partial<School>) => {
    setSchools(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    _api(() => apiPut(`schools/${id}`, data).then(() => loadSchools(true)));
  };
  const deleteSchool = (id: number) => {
    setSchools(prev => prev.filter(s => s.id !== id));
    _api(() => apiDelete(`schools/${id}`).then(() => loadSchools(true)));
  };

  // --- Courses (legacy API name: lessons) ---
  const addCourse = (course: Omit<Course, 'id'>) => {
    const newId = Date.now();
    const newCourse = { ...course, id: newId } as Course;
    setLessons(prev => [...prev, newCourse]);
    _api(() => apiPost('courses', course).then(() => loadLessons(true)));
    return newCourse;
  };
  const updateCourse = (id: number, data: Partial<Course>) => {
    setLessons(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    _api(() => apiPut(`courses/${id}`, data).then(() => loadLessons(true)));
  };
  const deleteCourse = (id: number) => {
    setLessons(prev => prev.filter(c => c.id !== id));
    _api(() => apiDelete(`courses/${id}`).then(() => loadLessons(true)));
  };

  // --- Course Schedules ---
  const addCourseSchedule = (schedule: Omit<CourseSchedule, 'id'>) => {
    const newId = Date.now();
    const newSchedule = { ...schedule, id: newId } as CourseSchedule;
    setCourseSchedules(prev => [...prev, newSchedule]);
    _api(() => apiPost('course-schedules', schedule).then(() => loadCourseSchedules(true)));
    return newSchedule;
  };
  const updateCourseSchedule = (id: number, data: Partial<CourseSchedule>) => {
    setCourseSchedules(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    _api(() => apiPut(`course-schedules/${id}`, data).then(() => loadCourseSchedules(true)));
  };
  const deleteCourseSchedule = (id: number) => {
    setCourseSchedules(prev => prev.filter(s => s.id !== id));
    _api(() => apiDelete(`course-schedules/${id}`).then(() => loadCourseSchedules(true)));
  };

  // --- Attendance ---
  const addAttendance = (a: Omit<Attendance, 'id'>) => {
    const newId = Date.now();
    const newA = { ...a, id: newId } as Attendance;
    setAttendance(prev => [...prev, newA]);
    _api(() => apiPost('attendance', a).then(() => loadAttendance(true)));
    return newA;
  };
  const updateAttendanceStatus = (id: number, status: string) => {
    setAttendance(prev => prev.map(a => a.id === id ? { ...a, status: status as any } : a));
    _api(() => apiPut(`attendance/${id}`, { status }).then(() => loadAttendance(true)));
  };
  const deleteAttendance = (id: number) => {
    setAttendance(prev => prev.filter(a => a.id !== id));
    _api(() => apiDelete(`attendance/${id}`).then(() => loadAttendance(true)));
  };

  // --- Progress ---
  const addProgress = (p: Omit<Progress, 'id'>) => {
    const newId = Date.now();
    const newP = { ...p, id: newId } as Progress;
    setProgress(prev => [...prev, newP]);
    _api(() => apiPost('progress', p).then(() => loadProgress(true)));
    return newP;
  };
  const updateProgress = (id: number, data: Partial<Progress>) => {
    setProgress(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    _api(() => apiPut(`progress/${id}`, data).then(() => loadProgress(true)));
  };
  const deleteProgress = (id: number) => {
    setProgress(prev => prev.filter(p => p.id !== id));
    _api(() => apiDelete(`progress/${id}`).then(() => loadProgress(true)));
  };

  // --- Comments ---
  const addComment = (c: Omit<Comment, 'id' | 'createdAt'>) => {
    const newId = Date.now();
    const newC = { ...c, id: newId, createdAt: new Date().toISOString() } as Comment;
    setComments(prev => [...prev, newC]);
    _api(() => apiPost('comments', c).then(() => loadComments(true)));
    return newC;
  };
  const deleteComment = (id: number) => {
    setComments(prev => prev.filter(c => c.id !== id));
    _api(() => apiDelete(`comments/${id}`).then(() => loadComments(true)));
  };

  // --- Reports ---
  const addReport = (r: any) => {
    const newId = Date.now();
    const newR = { ...r, id: newId };
    setReports(prev => [...prev, newR]);
    _api(() => apiPost('reports', r).then(() => loadReports(true)));
    return newR;
  };
  const deleteReport = (id: number) => {
    setReports(prev => prev.filter(r => r.id !== id));
    _api(() => apiDelete(`reports/${id}`).then(() => loadReports(true)));
  };
  const sendReport = (id: number) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'sent', sentAt: new Date().toISOString() } : r));
  };

  // --- ClassRooms ---
  const addClassRoom = (room: Omit<ClassRoom, 'id' | 'createdAt'>) => {
    const newId = Date.now();
    const newRoom = { ...room, id: newId, createdAt: new Date().toISOString().split('T')[0] } as ClassRoom;
    setClassRooms(prev => [...prev, newRoom]);
    _api(() => apiPost('class-rooms', room).then(() => loadClassRooms(true)));
    return newRoom;
  };
  const updateClassRoom = (id: number, data: Partial<ClassRoom>) => {
    setClassRooms(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    _api(() => apiPut(`class-rooms/${id}`, data).then(() => loadClassRooms(true)));
  };
  const deleteClassRoom = (id: number) => {
    setClassRooms(prev => prev.filter(r => r.id !== id));
    _api(() => apiDelete(`class-rooms/${id}`).then(() => loadClassRooms(true)));
  };
  const getClassRoomLessons = (roomId: number) => {
    // New course model: a classroom has schedules in course_schedules.
    return courseSchedules.filter(s => s.classRoomId === roomId);
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
    _api(() => apiPost('curriculum-topics', topic).then(() => loadCurriculumTopics(true)));
    return newT;
  };
  const deleteCurriculumTopic = (id: number) => {
    setCurriculumTopics(prev => prev.filter(t => t.id !== id));
    _api(() => apiDelete(`curriculum-topics/${id}`).then(() => loadCurriculumTopics(true)));
  };

  // --- Lesson Logs ---
  const addLessonLog = (log: Omit<LessonLog, 'id' | 'createdAt'>) => {
    const newId = Date.now();
    const newL = { ...log, id: newId, createdAt: new Date().toISOString() } as LessonLog;
    setLessonLogs(prev => [...prev, newL]);
    _api(() => apiPost('lesson-logs', log).then(() => loadLessonLogs(true)));
    return newL;
  };
  const getStudentLessonLogs = (studentId: number) => lessonLogs.filter(l => l.studentId === studentId);
  const deleteLessonLog = (id: number) => {
    setLessonLogs(prev => prev.filter(l => l.id !== id));
    _api(() => apiDelete(`lesson-logs/${id}`).then(() => loadLessonLogs(true)));
  };

  // --- Surveys ---
  const addSurvey = (s: any) => {
    const newId = Date.now();
    const newS = { ...s, id: newId };
    setSurveys(prev => [...prev, newS]);
    _api(() => apiPost('surveys', s).then(() => loadSurveys(true)));
    return newS;
  };
  const updateSurvey = (id: number, data: any) => {
    setSurveys(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    _api(() => apiPut(`surveys/${id}`, data).then(() => loadSurveys(true)));
  };
  const deleteSurvey = (id: number) => {
    setSurveys(prev => prev.filter(s => s.id !== id));
    _api(() => apiDelete(`surveys/${id}`).then(() => loadSurveys(true)));
  };
  const addSurveyQuestion = (q: any) => {
    const payload = surveyQuestionToApi(q);
    const newId = Date.now();
    const newQ = { ...nsq(payload), id: newId };
    setSurveyQuestions(prev => [...prev, newQ]);
    _api(() => apiPost('survey-questions', payload).then(() => loadSurveyQuestions(true)));
    return newQ;
  };
  const deleteSurveyQuestion = (id: number) => {
    setSurveyQuestions(prev => prev.filter(q => q.id !== id));
    _api(() => apiDelete(`survey-questions/${id}`).then(() => loadSurveyQuestions(true)));
  };
  const getSurveyQuestions = (surveyId: number) => surveyQuestions.filter(q => q.surveyId === surveyId || q.survey_id === surveyId);
  const addSurveyAnswer = (a: any) => {
    const newId = Date.now();
    const newA = { ...a, id: newId };
    setSurveyAnswers(prev => [...prev, newA]);
    _api(() => apiPost('survey-answers', a).then(() => loadSurveyAnswers(true)));
    return newA;
  };
  const deleteSurveyAnswer = (id: number) => {
    setSurveyAnswers(prev => prev.filter(a => a.id !== id));
    _api(() => apiDelete(`survey-answers/${id}`).then(() => loadSurveyAnswers(true)));
  };

  // --- Homework ---
  const addHomeworkTemplate = (t: any) => {
    const newId = Date.now();
    const newT = { ...t, id: newId };
    setHomeworkTemplates(prev => [...prev, newT]);
    _api(() => apiPost('homework-templates', t).then(() => loadHomeworkTemplates(true)));
    return newT;
  };
  const updateHomeworkTemplate = (id: number, data: any) => {
    setHomeworkTemplates(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    _api(() => apiPut(`homework-templates/${id}`, data).then(() => loadHomeworkTemplates(true)));
  };
  const deleteHomeworkTemplate = (id: number) => {
    setHomeworkTemplates(prev => prev.filter(t => t.id !== id));
    _api(() => apiDelete(`homework-templates/${id}`).then(() => loadHomeworkTemplates(true)));
  };
  const addHomeworkAssignment = (a: any) => {
    const newId = Date.now();
    const newA = { ...a, id: newId };
    setHomeworkAssignments(prev => [...prev, newA]);
    _api(() => apiPost('homework-assignments', a).then(() => loadHomeworkAssignments(true)));
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
    _api(() => apiDelete(`homework-assignments/${id}`).then(() => loadHomeworkAssignments(true)));
  };

  // --- Student Reports ---
  const addStudentReport = (r: any) => {
    const newId = Date.now();
    const newR = { ...r, id: newId };
    setStudentReports(prev => [...prev, newR]);
    _api(() => apiPost('student-reports', r).then(() => loadStudentReports(true)));
    return newR;
  };
  const getStudentReports = (studentId: number) => studentReports.filter(r => r.student_id === studentId || r.studentId === studentId);
  const deleteStudentReport = (id: number) => {
    setStudentReports(prev => prev.filter(r => r.id !== id));
    _api(() => apiDelete(`student-reports/${id}`).then(() => loadStudentReports(true)));
  };

  // --- Memorization Texts ---
  const addMemorizationText = (text: Omit<MemorizationText, 'id'>) => {
    const newId = Date.now();
    const newText = { ...text, id: newId } as MemorizationText;
    setMemorizationTexts(prev => [newText, ...prev]);
    _api(() => apiPost('memorization-texts', text).then(() => loadMemorizationTexts(true)));
    return newText;
  };
  const updateMemorizationText = (id: number, data: Partial<MemorizationText>) => {
    setMemorizationTexts(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    _api(() => apiPut(`memorization-texts/${id}`, data).then(() => loadMemorizationTexts(true)));
  };
  const deleteMemorizationText = (id: number) => {
    setMemorizationTexts(prev => prev.filter(t => t.id !== id));
    setMemorizationTracking(prev => prev.filter(r => r.textId !== id));
    _api(() => apiDelete(`memorization-texts/${id}`).then(() => loadMemorizationTexts(true)));
  };

  // --- Memorization Tracking ---
  const setMemorizationStatus = (
    studentId: number,
    textId: number,
    status: MemorizationStatus,
    teacherNote?: string,
    scores?: Record<string, number>,
  ) => {
    const existing = memorizationTracking.find(r => r.studentId === studentId && r.textId === textId);
    if (existing) {
      setMemorizationTracking(prev => prev.map(r => r.id === existing.id ? { ...r, status, teacherNote, scores } : r));
    } else {
      setMemorizationTracking(prev => [
        { id: Date.now(), studentId, textId, status, teacherNote, scores },
        ...prev,
      ]);
    }
    _api(() =>
      apiPost('memorization-tracking', { studentId, textId, status, teacherNote, scores })
        .then(() =>
          Promise.all([
            loadMemorizationTracking(true),
            loadMemorizationSummary(studentId, true),
          ]),
        ),
    );
  };
  const updateMemorizationTracking = (id: number, data: Partial<MemorizationTracking>) => {
    const record = memorizationTracking.find(r => r.id === id);
    setMemorizationTracking(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    _api(() =>
      apiPut(`memorization-tracking/${id}`, data).then(() => {
        const reloads: Promise<any>[] = [loadMemorizationTracking(true)];
        if (record) reloads.push(loadMemorizationSummary(record.studentId, true));
        return Promise.all(reloads);
      }),
    );
  };
  const deleteMemorizationTracking = (id: number) => {
    const record = memorizationTracking.find(r => r.id === id);
    setMemorizationTracking(prev => prev.filter(r => r.id !== id));
    _api(() =>
      apiDelete(`memorization-tracking/${id}`).then(() => {
        const reloads: Promise<any>[] = [loadMemorizationTracking(true)];
        if (record) reloads.push(loadMemorizationSummary(record.studentId, true));
        return Promise.all(reloads);
      }),
    );
  };

  // --- Memorization Criteria ---
  const addMemorizationCriteria = (criteria: Omit<MemorizationCriteria, 'id'>) => {
    const newId = Date.now();
    const newCriteria = { ...criteria, id: newId } as MemorizationCriteria;
    setMemorizationCriteria(prev => [...prev, newCriteria]);
    _api(() => apiPost('memorization-criteria', criteria).then(() => loadMemorizationCriteria(true)));
    return newCriteria;
  };
  const updateMemorizationCriteria = (id: number, data: Partial<MemorizationCriteria>) => {
    setMemorizationCriteria(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    _api(() => apiPut(`memorization-criteria/${id}`, data).then(() => loadMemorizationCriteria(true)));
  };
  const deleteMemorizationCriteria = (id: number) => {
    setMemorizationCriteria(prev => prev.filter(c => c.id !== id));
    _api(() => apiDelete(`memorization-criteria/${id}`).then(() => loadMemorizationCriteria(true)));
  };

  // --- Parent-Student Links ---
  const addParentStudentLink = (parentUserId: number, studentId: number) => {
    setParentStudentLinks(prev => [...prev, { parentUserId, studentId }]);
    _api(() => apiPost('parent-student-links', { parentUserId, studentId }).then(() => loadParentStudentLinks(true)));
  };
  const deleteParentStudentLink = (parentUserId: number, studentId: number) => {
    setParentStudentLinks(prev => prev.filter(l => !(l.parentUserId === parentUserId && l.studentId === studentId)));
    _api(() => apiDelete(`parent-student-links?parentUserId=${parentUserId}&studentId=${studentId}`).then(() => loadParentStudentLinks(true)));
  };
  const getStudentParents = (studentId: number) => parentStudentLinks.filter(l => l.studentId === studentId).map(l => l.parentUserId);
  const getParentStudents = (parentUserId: number) => parentStudentLinks.filter(l => l.parentUserId === parentUserId).map(l => l.studentId);

  return {
    // data
    students, schools, lessons, courseSchedules, attendance, progress, comments, reports,
    surveys, surveyQuestions, surveyAnswers,
    curriculumTopics, lessonLogs, classRooms,
    homeworkTemplates, homeworkAssignments,
    studentReports,
    memorizationTexts, memorizationTracking, memorizationCriteria, memorizationSummaries,
    parentStudentLinks,
    // loaders
    loadStudents, loadSchools, loadLessons, loadCourseSchedules, loadAttendance, loadProgress, loadComments,
    loadReports, loadCurriculumTopics, loadLessonLogs, loadClassRooms,
    loadSurveys, loadSurveyQuestions, loadSurveyAnswers,
    loadHomeworkTemplates, loadHomeworkAssignments, loadStudentReports,
    loadMemorizationTexts, loadMemorizationTracking, loadMemorizationCriteria, loadMemorizationSummary,
    loadParentStudentLinks,
    // loading flags
    loadingStudents, loadingSchools, loadingLessons, loadingCourseSchedules, loadingAttendance, loadingProgress, loadingComments,
    loadingReports, loadingCurriculumTopics, loadingLessonLogs, loadingClassRooms,
    loadingSurveys, loadingSurveyQuestions, loadingSurveyAnswers,
    loadingHomeworkTemplates, loadingHomeworkAssignments, loadingStudentReports,
    loadingMemorizationTexts, loadingMemorizationTracking, loadingMemorizationCriteria, loadingMemorizationSummary,
    loadingParentStudentLinks,
    // CRUD helpers
    addStudent, updateStudent, deleteStudent, getStudentLessons, assignCourseToStudents,
    addSchool, updateSchool, deleteSchool,
    addCourse, updateCourse, deleteCourse, addCourseSchedule, updateCourseSchedule, deleteCourseSchedule,
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
    addMemorizationText, updateMemorizationText, deleteMemorizationText,
    setMemorizationStatus, updateMemorizationTracking, deleteMemorizationTracking,
    addMemorizationCriteria, updateMemorizationCriteria, deleteMemorizationCriteria,
    addParentStudentLink, deleteParentStudentLink,
    getStudentParents, getParentStudents,
  };
}

// ================================================================
// Normalizers (DB snake_case -> JS camelCase)
// ================================================================
function ns(r: any): Student {
  return {
    id: r.id, tcKimlik: r.tc_kimlik || '', firstName: r.first_name || '', lastName: r.last_name || '',
    age: r.age || 0, birthYear: r.birth_year || 0, city: r.city || '',
    schoolId: r.school_id || 0, schoolName: r.resolved_school_name || r.school_name || r.school_name_ref || '', grade: r.grade || '',
    phone: r.phone || '', parentName: r.parent_name || '', parentPhone: r.parent_phone || '', email: r.email || '',
    lessons: Array.isArray(r.lessons) ? r.lessons : safeJson(r.lessons),
    groupId: r.group_id ?? r.groupId ?? null,
    createdAt: r.created_at || r.createdAt || '',
  };
}
function nsc(r: any): School {
  return { id: r.id, name: r.name || '', address: r.address || '', phone: r.phone || '', principalName: r.principal_name || '', active: r.active !== false };
}
function nc(r: any): Course {
  return { id: r.id, name: r.name || '', description: r.description || '', active: r.active !== false, createdAt: r.created_at || '' };
}
function nl(r: any): CourseSchedule {
  return {
    id: r.id,
    courseId: r.course_id ?? r.courseId ?? 0,
    teacherId: r.teacher_id ?? r.teacherId ?? null,
    classRoomId: r.class_room_id ?? r.classRoomId ?? null,
    dayOfWeek: r.day_of_week ?? r.dayOfWeek ?? '',
    startTime: r.start_time ?? r.startTime ?? '',
    endTime: r.end_time ?? r.endTime ?? '',
    active: r.active !== false && r.active !== 0 && r.active !== '0',
    createdAt: r.created_at ?? r.createdAt ?? '',
    name: r.name || '',
    description: r.description || '',
    teacher: r.teacher_name || r.teacher || '',
    teacherName: r.teacher_name || r.teacherName || '',
  };
}
function na(r: any): Attendance {
  return {
    id: r.id,
    studentId: r.student_id,
    classRoomId: r.class_room_id ?? null,
    lessonId: r.lesson_id ?? null,
    date: r.date || '',
    status: r.status || 'present',
    notes: r.notes || '',
    createdBy: r.created_by,
  };
}
function np(r: any): Progress {
  return {
    id: r.id, studentId: r.student_id, date: r.date || '',
    kuranCurrentPage: r.kuran_current_page || 0, kuranTargetPage: r.kuran_target_page || 0, kuranPages: r.kuran_pages || 0,
    risaleCurrentPage: r.risale_current_page || 0, risaleTargetPage: r.risale_target_page || 0, risalePages: r.risale_pages || 0,
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
function nmt(r: any): MemorizationText {
  return {
    id: r.id,
    title: r.title || '',
    content: r.content || '',
    active: r.active !== false,
    createdBy: r.created_by,
    createdByName: r.created_by_name || '',
    createdAt: r.created_at || '',
  };
}
function nsq(r: any) {
  return {
    id: r.id,
    surveyId: r.surveyId ?? r.survey_id ?? 0,
    questionText: r.questionText ?? r.question ?? '',
    type: surveyTypeFromApi(r.type ?? r.questionType ?? r.question_type ?? 'text'),
    options: Array.isArray(r.options) ? r.options : safeJson(r.options),
    sortOrder: r.sortOrder ?? r.sort_order ?? 0,
  };
}
function nsa(r: any) {
  return {
    id: r.id,
    studentId: r.studentId ?? r.student_id,
    surveyId: r.surveyId ?? r.survey_id,
    questionId: r.questionId ?? r.question_id,
    answer: r.answer ?? '',
    createdAt: r.createdAt ?? r.created_at,
  };
}
function nmtr(r: any): MemorizationTracking {
  return {
    id: r.id,
    studentId: r.student_id,
    textId: r.text_id,
    status: r.status || 'failed',
    scores: safeJsonRecord(r.scores),
    teacherNote: r.teacher_note || '',
    checkedBy: r.checked_by,
    checkedByName: r.checked_by_name || '',
    checkedAt: r.checked_at || '',
    createdAt: r.created_at || '',
    updatedAt: r.updated_at || '',
  };
}
function nmc(r: any): MemorizationCriteria {
  return {
    id: r.id,
    code: r.code || '',
    label: r.label || '',
    maxScore: r.max_score ?? 100,
    weight: r.weight ?? 1,
    active: r.active !== false && r.active !== 0 && r.active !== '0',
    sortOrder: r.sort_order ?? 0,
    createdAt: r.created_at || '',
  };
}
function safeJsonRecord(v: any): Record<string, number> | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'object' && !Array.isArray(v)) return v as Record<string, number>;
  try {
    const parsed = JSON.parse(v);
    if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, number>;
  } catch { /* ignore */ }
  return undefined;
}
function safeJson(v: any): any[] {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v || '[]'); } catch { return []; }
}

function surveyTypeToApi(t: string) {
  const normalized = String(t || 'text');
  if (normalized === 'select') return 'single_choice';
  if (normalized === 'multiselect') return 'multiple_choice';
  if (normalized === 'test') return 'single_choice';
  return 'text';
}

function surveyTypeFromApi(t: string) {
  const normalized = String(t || 'text');
  if (normalized === 'single_choice') return 'select';
  if (normalized === 'multiple_choice') return 'multiselect';
  return 'text';
}

function surveyQuestionToApi(q: any) {
  return {
    surveyId: q?.surveyId ?? q?.survey_id ?? 0,
    question: q?.question ?? q?.questionText ?? '',
    questionType: surveyTypeToApi(q?.questionType ?? q?.type ?? 'text'),
    options: Array.isArray(q?.options) ? q.options : [],
    sortOrder: Number(q?.sortOrder ?? q?.sort_order ?? 0),
  };
}

// ================================================================
// Global StudentData Context
// ================================================================
type StudentDataContextValue = ReturnType<typeof useStudentDataInternal>;
const StudentDataContext = createContext<StudentDataContextValue | undefined>(undefined);

export function StudentDataProvider({ children }: { children: ReactNode }) {
  const value = useStudentDataInternal();
  return (
    <StudentDataContext.Provider value={value}>
      {children}
    </StudentDataContext.Provider>
  );
}

export function useStudentData() {
  const ctx = useContext(StudentDataContext);
  if (!ctx) {
    throw new Error('useStudentData must be used within StudentDataProvider');
  }
  return ctx;
}
