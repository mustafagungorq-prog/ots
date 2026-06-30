from typing import List, Optional
from ots.database.db import Database
from ots.models.student import Student


class StudentService:
    def __init__(self, db: Database):
        self.db = db

    def add(self, student: Student) -> Student:
        with self.db.connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO students (student_no, first_name, last_name, birth_date, email, phone)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    student.student_no,
                    student.first_name,
                    student.last_name,
                    student.birth_date,
                    student.email,
                    student.phone,
                ),
            )
            student.id = cursor.lastrowid
        return student

    def get(self, student_id: int) -> Optional[Student]:
        with self.db.connection() as conn:
            row = conn.execute(
                "SELECT * FROM students WHERE id = ?", (student_id,)
            ).fetchone()
        return self._row_to_student(row) if row else None

    def get_by_no(self, student_no: str) -> Optional[Student]:
        with self.db.connection() as conn:
            row = conn.execute(
                "SELECT * FROM students WHERE student_no = ?", (student_no,)
            ).fetchone()
        return self._row_to_student(row) if row else None

    def list_all(self) -> List[Student]:
        with self.db.connection() as conn:
            rows = conn.execute(
                "SELECT * FROM students ORDER BY last_name, first_name"
            ).fetchall()
        return [self._row_to_student(r) for r in rows]

    def update(self, student: Student) -> bool:
        with self.db.connection() as conn:
            rowcount = conn.execute(
                """
                UPDATE students
                SET first_name=?, last_name=?, birth_date=?, email=?, phone=?
                WHERE id=?
                """,
                (
                    student.first_name,
                    student.last_name,
                    student.birth_date,
                    student.email,
                    student.phone,
                    student.id,
                ),
            ).rowcount
        return rowcount > 0

    def delete(self, student_id: int) -> bool:
        with self.db.connection() as conn:
            rowcount = conn.execute(
                "DELETE FROM students WHERE id = ?", (student_id,)
            ).rowcount
        return rowcount > 0

    @staticmethod
    def _row_to_student(row) -> Student:
        return Student(
            id=row["id"],
            student_no=row["student_no"],
            first_name=row["first_name"],
            last_name=row["last_name"],
            birth_date=row["birth_date"],
            email=row["email"],
            phone=row["phone"],
            created_at=row["created_at"],
        )
