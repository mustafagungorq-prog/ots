import pytest
from ots.database.db import Database
from ots.models.student import Student
from ots.services.student_service import StudentService


@pytest.fixture
def db(tmp_path):
    return Database(str(tmp_path / "test.db"))


@pytest.fixture
def service(db):
    return StudentService(db)


def test_add_student(service):
    student = Student(student_no="2024001", first_name="Ali", last_name="Yılmaz")
    result = service.add(student)
    assert result.id is not None
    assert result.student_no == "2024001"
    assert result.full_name == "Ali Yılmaz"


def test_get_student(service):
    student = service.add(Student(student_no="2024002", first_name="Ayşe", last_name="Kaya"))
    found = service.get(student.id)
    assert found is not None
    assert found.student_no == "2024002"


def test_get_by_no(service):
    service.add(Student(student_no="2024003", first_name="Mehmet", last_name="Demir"))
    found = service.get_by_no("2024003")
    assert found is not None
    assert found.first_name == "Mehmet"


def test_get_by_no_not_found(service):
    assert service.get_by_no("9999") is None


def test_list_all(service):
    service.add(Student(student_no="2024010", first_name="Fatma", last_name="Çelik"))
    service.add(Student(student_no="2024011", first_name="Hasan", last_name="Aydın"))
    students = service.list_all()
    assert len(students) >= 2


def test_update_student(service):
    student = service.add(Student(student_no="2024020", first_name="Can", last_name="Öz"))
    student.email = "can@example.com"
    ok = service.update(student)
    assert ok
    updated = service.get(student.id)
    assert updated.email == "can@example.com"


def test_delete_student(service):
    student = service.add(Student(student_no="2024030", first_name="Selin", last_name="Kurt"))
    ok = service.delete(student.id)
    assert ok
    assert service.get(student.id) is None


def test_duplicate_student_no_raises(service):
    service.add(Student(student_no="2024040", first_name="A", last_name="B"))
    with pytest.raises(Exception):
        service.add(Student(student_no="2024040", first_name="C", last_name="D"))


def test_full_name_property():
    student = Student(student_no="001", first_name="Ada", last_name="Lovelace")
    assert student.full_name == "Ada Lovelace"


def test_student_str():
    student = Student(student_no="001", first_name="Ada", last_name="Lovelace")
    assert "001" in str(student)
    assert "Ada Lovelace" in str(student)
