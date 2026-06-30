export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  grade: string;
  birthYear: number;
  city: string;
  parentName: string;
  parentPhone: string;
  email: string;
  createdAt: string;
}

export interface Lesson {
  id: number;
  name: string;
  teacher: string;
  description: string;
}

export interface Attendance {
  id: number;
  studentId: number;
  date: string;
  status: 'present' | 'absent' | 'late';
  lessonId: number;
}

export interface Homework {
  id: number;
  studentId: number;
  lessonId: number;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
}

export interface Comment {
  id: number;
  studentId: number;
  type: 'teacher' | 'parent';
  author: string;
  content: string;
  createdAt: string;
}

export interface StudentLesson {
  studentId: number;
  lessonId: number;
}
