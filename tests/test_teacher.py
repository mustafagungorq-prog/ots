import pytest
from ots.database.db import Database
from ots.models.teacher import Teacher
from ots.services.teacher_service import TeacherService


@pytest.fixture
def db(tmp_path):
    return Database(str(tmp_path / "test.db"))


@pytest.fixture
def service(db):
    return TeacherService(db)


def test_add_teacher(service):
    teacher = Teacher(first_name="Ahmet", last_name="Yıldız", email="ahmet@okul.edu")
    result = service.add(teacher)
    assert result.id is not None
    assert result.full_name == "Ahmet Yıldız"


def test_get_teacher(service):
    teacher = service.add(Teacher(first_name="Zeynep", last_name="Şahin", email="zeynep@okul.edu", branch="Matematik"))
    found = service.get(teacher.id)
    assert found is not None
    assert found.branch == "Matematik"


def test_list_teachers(service):
    service.add(Teacher(first_name="A", last_name="B", email="a@b.com"))
    service.add(Teacher(first_name="C", last_name="D", email="c@d.com"))
    teachers = service.list_all()
    assert len(teachers) >= 2


def test_update_teacher(service):
    teacher = service.add(Teacher(first_name="Ozan", last_name="Yılmaz", email="ozan@okul.edu"))
    teacher.branch = "Fizik"
    ok = service.update(teacher)
    assert ok
    updated = service.get(teacher.id)
    assert updated.branch == "Fizik"


def test_delete_teacher(service):
    teacher = service.add(Teacher(first_name="Lale", last_name="Ak", email="lale@okul.edu"))
    ok = service.delete(teacher.id)
    assert ok
    assert service.get(teacher.id) is None


def test_teacher_str_with_branch():
    teacher = Teacher(first_name="Kemal", last_name="Atak", email="k@k.com", branch="Tarih")
    assert "Kemal Atak" in str(teacher)
    assert "Tarih" in str(teacher)


def test_teacher_str_without_branch():
    teacher = Teacher(first_name="Kemal", last_name="Atak", email="k@k.com")
    result = str(teacher)
    assert "Kemal Atak" in result
