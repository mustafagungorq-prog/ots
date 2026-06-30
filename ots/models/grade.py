from dataclasses import dataclass
from typing import Optional


@dataclass
class Grade:
    student_id: int
    course_id: int
    grade: float
    grade_type: str = "midterm"
    id: Optional[int] = None
    created_at: Optional[str] = None

    def __str__(self) -> str:
        return f"Not: {self.grade} ({self.grade_type})"


@dataclass
class Attendance:
    student_id: int
    course_id: int
    date: str
    status: str
    id: Optional[int] = None

    def __str__(self) -> str:
        status_map = {"present": "Var", "absent": "Yok", "late": "Geç"}
        return f"{self.date}: {status_map.get(self.status, self.status)}"
