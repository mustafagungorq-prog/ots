import sqlite3
from typing import List, Optional
from ots.database.db import Database
from ots.models.course import Course


class CourseService:
    def __init__(self, db: Database):
        self.db = db

    def add(self, course: Course) -> Course:
        with self.db.connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO courses (code, name, teacher_id, credits)
                VALUES (?, ?, ?, ?)
                """,
                (course.code, course.name, course.teacher_id, course.credits),
            )
            course.id = cursor.lastrowid
        return course

    def get(self, course_id: int) -> Optional[Course]:
        with self.db.connection() as conn:
            row = conn.execute(
                "SELECT * FROM courses WHERE id = ?", (course_id,)
            ).fetchone()
        return self._row_to_course(row) if row else None

    def get_by_code(self, code: str) -> Optional[Course]:
        with self.db.connection() as conn:
            row = conn.execute(
                "SELECT * FROM courses WHERE code = ?", (code,)
            ).fetchone()
        return self._row_to_course(row) if row else None

    def list_all(self) -> List[Course]:
        with self.db.connection() as conn:
            rows = conn.execute(
                "SELECT * FROM courses ORDER BY name"
            ).fetchall()
        return [self._row_to_course(r) for r in rows]

    def enroll_student(self, student_id: int, course_id: int) -> bool:
        try:
            with self.db.connection() as conn:
                conn.execute(
                    "INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)",
                    (student_id, course_id),
                )
            return True
        except sqlite3.IntegrityError:
            return False

    def unenroll_student(self, student_id: int, course_id: int) -> bool:
        with self.db.connection() as conn:
            rowcount = conn.execute(
                "DELETE FROM enrollments WHERE student_id=? AND course_id=?",
                (student_id, course_id),
            ).rowcount
        return rowcount > 0

    def get_enrolled_students(self, course_id: int) -> List[int]:
        with self.db.connection() as conn:
            rows = conn.execute(
                "SELECT student_id FROM enrollments WHERE course_id = ?",
                (course_id,),
            ).fetchall()
        return [r["student_id"] for r in rows]

    def get_student_courses(self, student_id: int) -> List[Course]:
        with self.db.connection() as conn:
            rows = conn.execute(
                """
                SELECT c.* FROM courses c
                JOIN enrollments e ON c.id = e.course_id
                WHERE e.student_id = ?
                ORDER BY c.name
                """,
                (student_id,),
            ).fetchall()
        return [self._row_to_course(r) for r in rows]

    def update(self, course: Course) -> bool:
        with self.db.connection() as conn:
            rowcount = conn.execute(
                """
                UPDATE courses
                SET name=?, teacher_id=?, credits=?
                WHERE id=?
                """,
                (course.name, course.teacher_id, course.credits, course.id),
            ).rowcount
        return rowcount > 0

    def delete(self, course_id: int) -> bool:
        with self.db.connection() as conn:
            rowcount = conn.execute(
                "DELETE FROM courses WHERE id = ?", (course_id,)
            ).rowcount
        return rowcount > 0

    @staticmethod
    def _row_to_course(row) -> Course:
        return Course(
            id=row["id"],
            code=row["code"],
            name=row["name"],
            teacher_id=row["teacher_id"],
            credits=row["credits"],
            created_at=row["created_at"],
        )
