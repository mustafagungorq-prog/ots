from dataclasses import dataclass
from typing import Optional


@dataclass
class Student:
    student_no: str
    first_name: str
    last_name: str
    birth_date: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    id: Optional[int] = None
    created_at: Optional[str] = None

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def __str__(self) -> str:
        return f"[{self.student_no}] {self.full_name}"
