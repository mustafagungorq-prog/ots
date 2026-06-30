from typing import List, Optional
from ots.database.db import Database
from ots.models.teacher import Teacher


class TeacherService:
    def __init__(self, db: Database):
        self.db = db

    def add(self, teacher: Teacher) -> Teacher:
        with self.db.connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO teachers (first_name, last_name, email, phone, branch)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    teacher.first_name,
                    teacher.last_name,
                    teacher.email,
                    teacher.phone,
                    teacher.branch,
                ),
            )
            teacher.id = cursor.lastrowid
        return teacher

    def get(self, teacher_id: int) -> Optional[Teacher]:
        with self.db.connection() as conn:
            row = conn.execute(
                "SELECT * FROM teachers WHERE id = ?", (teacher_id,)
            ).fetchone()
        return self._row_to_teacher(row) if row else None

    def list_all(self) -> List[Teacher]:
        with self.db.connection() as conn:
            rows = conn.execute(
                "SELECT * FROM teachers ORDER BY last_name, first_name"
            ).fetchall()
        return [self._row_to_teacher(r) for r in rows]

    def update(self, teacher: Teacher) -> bool:
        with self.db.connection() as conn:
            rowcount = conn.execute(
                """
                UPDATE teachers
                SET first_name=?, last_name=?, email=?, phone=?, branch=?
                WHERE id=?
                """,
                (
                    teacher.first_name,
                    teacher.last_name,
                    teacher.email,
                    teacher.phone,
                    teacher.branch,
                    teacher.id,
                ),
            ).rowcount
        return rowcount > 0

    def delete(self, teacher_id: int) -> bool:
        with self.db.connection() as conn:
            rowcount = conn.execute(
                "DELETE FROM teachers WHERE id = ?", (teacher_id,)
            ).rowcount
        return rowcount > 0

    @staticmethod
    def _row_to_teacher(row) -> Teacher:
        return Teacher(
            id=row["id"],
            first_name=row["first_name"],
            last_name=row["last_name"],
            email=row["email"],
            phone=row["phone"],
            branch=row["branch"],
            created_at=row["created_at"],
        )
