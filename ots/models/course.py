from dataclasses import dataclass
from typing import Optional


@dataclass
class Course:
    code: str
    name: str
    teacher_id: Optional[int] = None
    credits: int = 1
    id: Optional[int] = None
    created_at: Optional[str] = None

    def __str__(self) -> str:
        return f"[{self.code}] {self.name} ({self.credits} kredi)"
