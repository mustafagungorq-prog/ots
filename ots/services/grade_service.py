from typing import List, Optional
from ots.database.db import Database
from ots.models.grade import Grade, Attendance


class GradeService:
    def __init__(self, db: Database):
        self.db = db

    def add_grade(self, grade: Grade) -> Grade:
        with self.db.connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO grades (student_id, course_id, grade, grade_type)
                VALUES (?, ?, ?, ?)
                """,
                (grade.student_id, grade.course_id, grade.grade, grade.grade_type),
            )
            grade.id = cursor.lastrowid
        return grade

    def get_student_grades(
        self, student_id: int, course_id: Optional[int] = None
    ) -> List[Grade]:
        with self.db.connection() as conn:
            if course_id is not None:
                rows = conn.execute(
                    "SELECT * FROM grades WHERE student_id=? AND course_id=? ORDER BY created_at",
                    (student_id, course_id),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM grades WHERE student_id=? ORDER BY created_at",
                    (student_id,),
                ).fetchall()
        return [self._row_to_grade(r) for r in rows]

    def get_average(self, student_id: int, course_id: int) -> Optional[float]:
        with self.db.connection() as conn:
            row = conn.execute(
                "SELECT AVG(grade) as avg FROM grades WHERE student_id=? AND course_id=?",
                (student_id, course_id),
            ).fetchone()
        return row["avg"] if row and row["avg"] is not None else None

    def get_course_averages(self, student_id: int) -> List[dict]:
        with self.db.connection() as conn:
            rows = conn.execute(
                """
                SELECT c.code, c.name, AVG(g.grade) as average
                FROM grades g
                JOIN courses c ON g.course_id = c.id
                WHERE g.student_id = ?
                GROUP BY g.course_id
                ORDER BY c.name
                """,
                (student_id,),
            ).fetchall()
        return [{"code": r["code"], "name": r["name"], "average": r["average"]} for r in rows]

    @staticmethod
    def _row_to_grade(row) -> Grade:
        return Grade(
            id=row["id"],
            student_id=row["student_id"],
            course_id=row["course_id"],
            grade=row["grade"],
            grade_type=row["grade_type"],
            created_at=row["created_at"],
        )


class AttendanceService:
    def __init__(self, db: Database):
        self.db = db

    def record(self, attendance: Attendance) -> Attendance:
        with self.db.connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO attendance (student_id, course_id, date, status)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(student_id, course_id, date) DO UPDATE SET status=excluded.status
                """,
                (attendance.student_id, attendance.course_id, attendance.date, attendance.status),
            )
            attendance.id = cursor.lastrowid
        return attendance

    def get_student_attendance(
        self, student_id: int, course_id: Optional[int] = None
    ) -> List[Attendance]:
        with self.db.connection() as conn:
            if course_id is not None:
                rows = conn.execute(
                    "SELECT * FROM attendance WHERE student_id=? AND course_id=? ORDER BY date",
                    (student_id, course_id),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM attendance WHERE student_id=? ORDER BY date",
                    (student_id,),
                ).fetchall()
        return [self._row_to_attendance(r) for r in rows]

    def get_attendance_summary(self, student_id: int, course_id: int) -> dict:
        with self.db.connection() as conn:
            rows = conn.execute(
                "SELECT status, COUNT(*) as count FROM attendance WHERE student_id=? AND course_id=? GROUP BY status",
                (student_id, course_id),
            ).fetchall()
        summary = {"present": 0, "absent": 0, "late": 0}
        for row in rows:
            summary[row["status"]] = row["count"]
        total = sum(summary.values())
        if total > 0:
            summary["attendance_rate"] = round(
                (summary["present"] + summary["late"]) / total * 100, 1
            )
        else:
            summary["attendance_rate"] = 0.0
        return summary

    @staticmethod
    def _row_to_attendance(row) -> Attendance:
        return Attendance(
            id=row["id"],
            student_id=row["student_id"],
            course_id=row["course_id"],
            date=row["date"],
            status=row["status"],
        )
