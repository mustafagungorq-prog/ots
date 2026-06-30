import pytest
from ots.database.db import Database
from ots.models.student import Student
from ots.models.course import Course
from ots.models.grade import Grade, Attendance
from ots.services.student_service import StudentService
from ots.services.course_service import CourseService
from ots.services.grade_service import GradeService, AttendanceService


@pytest.fixture
def db(tmp_path):
    return Database(str(tmp_path / "test.db"))


@pytest.fixture
def setup(db):
    student_svc = StudentService(db)
    course_svc = CourseService(db)
    grade_svc = GradeService(db)
    att_svc = AttendanceService(db)
    student = student_svc.add(Student(student_no="4001", first_name="Test", last_name="Ogrenci"))
    course = course_svc.add(Course(code="TST101", name="Test Dersi"))
    return student, course, grade_svc, att_svc


def test_add_grade(setup):
    student, course, grade_svc, _ = setup
    grade = grade_svc.add_grade(Grade(student_id=student.id, course_id=course.id, grade=85.0))
    assert grade.id is not None


def test_get_student_grades(setup):
    student, course, grade_svc, _ = setup
    grade_svc.add_grade(Grade(student_id=student.id, course_id=course.id, grade=90.0, grade_type="midterm"))
    grade_svc.add_grade(Grade(student_id=student.id, course_id=course.id, grade=80.0, grade_type="final"))
    grades = grade_svc.get_student_grades(student.id)
    assert len(grades) == 2


def test_get_average(setup):
    student, course, grade_svc, _ = setup
    grade_svc.add_grade(Grade(student_id=student.id, course_id=course.id, grade=70.0))
    grade_svc.add_grade(Grade(student_id=student.id, course_id=course.id, grade=90.0))
    avg = grade_svc.get_average(student.id, course.id)
    assert avg == pytest.approx(80.0)


def test_get_course_averages(setup):
    student, course, grade_svc, _ = setup
    grade_svc.add_grade(Grade(student_id=student.id, course_id=course.id, grade=75.0))
    averages = grade_svc.get_course_averages(student.id)
    assert len(averages) == 1
    assert averages[0]["code"] == "TST101"
    assert averages[0]["average"] == pytest.approx(75.0)


def test_get_average_no_grades(setup):
    student, course, grade_svc, _ = setup
    avg = grade_svc.get_average(student.id, course.id)
    assert avg is None


def test_record_attendance(setup):
    student, course, _, att_svc = setup
    att = att_svc.record(Attendance(student_id=student.id, course_id=course.id, date="2024-03-01", status="present"))
    assert att.id is not None


def test_attendance_update_on_conflict(setup):
    student, course, _, att_svc = setup
    att_svc.record(Attendance(student_id=student.id, course_id=course.id, date="2024-03-02", status="absent"))
    att_svc.record(Attendance(student_id=student.id, course_id=course.id, date="2024-03-02", status="present"))
    records = att_svc.get_student_attendance(student.id, course.id)
    records_for_date = [r for r in records if r.date == "2024-03-02"]
    assert len(records_for_date) == 1
    assert records_for_date[0].status == "present"


def test_attendance_summary(setup):
    student, course, _, att_svc = setup
    att_svc.record(Attendance(student_id=student.id, course_id=course.id, date="2024-03-01", status="present"))
    att_svc.record(Attendance(student_id=student.id, course_id=course.id, date="2024-03-02", status="absent"))
    att_svc.record(Attendance(student_id=student.id, course_id=course.id, date="2024-03-03", status="late"))
    summary = att_svc.get_attendance_summary(student.id, course.id)
    assert summary["present"] == 1
    assert summary["absent"] == 1
    assert summary["late"] == 1
    assert summary["attendance_rate"] == pytest.approx(66.7)


def test_attendance_summary_empty(setup):
    student, course, _, att_svc = setup
    summary = att_svc.get_attendance_summary(student.id, course.id)
    assert summary["attendance_rate"] == 0.0


def test_attendance_str():
    att = Attendance(student_id=1, course_id=1, date="2024-01-15", status="present")
    assert "2024-01-15" in str(att)
    assert "Var" in str(att)
