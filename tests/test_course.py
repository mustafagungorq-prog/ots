import pytest
from ots.database.db import Database
from ots.models.student import Student
from ots.models.teacher import Teacher
from ots.models.course import Course
from ots.services.student_service import StudentService
from ots.services.teacher_service import TeacherService
from ots.services.course_service import CourseService


@pytest.fixture
def db(tmp_path):
    return Database(str(tmp_path / "test.db"))


@pytest.fixture
def services(db):
    return StudentService(db), TeacherService(db), CourseService(db)


def test_add_course(services):
    _, _, course_svc = services
    course = Course(code="MAT101", name="Matematik", credits=3)
    result = course_svc.add(course)
    assert result.id is not None
    assert str(result) == "[MAT101] Matematik (3 kredi)"


def test_get_course(services):
    _, _, course_svc = services
    course_svc.add(Course(code="FIZ101", name="Fizik", credits=4))
    found = course_svc.get_by_code("FIZ101")
    assert found is not None
    assert found.name == "Fizik"


def test_list_courses(services):
    _, _, course_svc = services
    course_svc.add(Course(code="TUR101", name="Türkçe"))
    course_svc.add(Course(code="ING101", name="İngilizce"))
    courses = course_svc.list_all()
    assert len(courses) >= 2


def test_enroll_student(services):
    student_svc, _, course_svc = services
    student = student_svc.add(Student(student_no="3001", first_name="Ali", last_name="Veli"))
    course = course_svc.add(Course(code="BIO101", name="Biyoloji"))
    ok = course_svc.enroll_student(student.id, course.id)
    assert ok
    enrolled = course_svc.get_enrolled_students(course.id)
    assert student.id in enrolled


def test_enroll_duplicate(services):
    student_svc, _, course_svc = services
    student = student_svc.add(Student(student_no="3002", first_name="B", last_name="C"))
    course = course_svc.add(Course(code="KIM101", name="Kimya"))
    course_svc.enroll_student(student.id, course.id)
    ok = course_svc.enroll_student(student.id, course.id)
    assert not ok


def test_unenroll_student(services):
    student_svc, _, course_svc = services
    student = student_svc.add(Student(student_no="3003", first_name="D", last_name="E"))
    course = course_svc.add(Course(code="TAR101", name="Tarih"))
    course_svc.enroll_student(student.id, course.id)
    ok = course_svc.unenroll_student(student.id, course.id)
    assert ok
    enrolled = course_svc.get_enrolled_students(course.id)
    assert student.id not in enrolled


def test_get_student_courses(services):
    student_svc, _, course_svc = services
    student = student_svc.add(Student(student_no="3004", first_name="F", last_name="G"))
    c1 = course_svc.add(Course(code="MUZ101", name="Müzik"))
    c2 = course_svc.add(Course(code="RSM101", name="Resim"))
    course_svc.enroll_student(student.id, c1.id)
    course_svc.enroll_student(student.id, c2.id)
    courses = course_svc.get_student_courses(student.id)
    codes = [c.code for c in courses]
    assert "MUZ101" in codes
    assert "RSM101" in codes


def test_delete_course(services):
    _, _, course_svc = services
    course = course_svc.add(Course(code="GEO101", name="Coğrafya"))
    ok = course_svc.delete(course.id)
    assert ok
    assert course_svc.get_by_code("GEO101") is None


def test_course_with_teacher(services):
    _, teacher_svc, course_svc = services
    teacher = teacher_svc.add(Teacher(first_name="Prof", last_name="Dr", email="prof@okul.edu"))
    course = course_svc.add(Course(code="MAT202", name="Cebir", teacher_id=teacher.id))
    found = course_svc.get(course.id)
    assert found.teacher_id == teacher.id
