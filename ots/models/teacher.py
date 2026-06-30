from dataclasses import dataclass
from typing import Optional


@dataclass
class Teacher:
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    branch: Optional[str] = None
    id: Optional[int] = None
    created_at: Optional[str] = None

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def __str__(self) -> str:
        branch_info = f" ({self.branch})" if self.branch else ""
        return f"{self.full_name}{branch_info} <{self.email}>"
