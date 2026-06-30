import pytest
from ots.cli import run


@pytest.fixture
def db_path(tmp_path):
    return str(tmp_path / "test.db")


def test_add_and_list_student(db_path, capsys):
    run(["--db", db_path, "ogrenci", "ekle", "2024001", "Ali", "Yılmaz"])
    run(["--db", db_path, "ogrenci", "listele"])
    captured = capsys.readouterr()
    assert "2024001" in captured.out
    assert "Ali" in captured.out


def test_add_and_list_teacher(db_path, capsys):
    run(["--db", db_path, "ogretmen", "ekle", "Ahmet", "Yıldız", "ahmet@okul.edu", "--brans", "Matematik"])
    run(["--db", db_path, "ogretmen", "listele"])
    captured = capsys.readouterr()
    assert "Ahmet" in captured.out
    assert "Matematik" in captured.out


def test_add_and_list_course(db_path, capsys):
    run(["--db", db_path, "ders", "ekle", "MAT101", "Matematik", "--kredi", "3"])
    run(["--db", db_path, "ders", "listele"])
    captured = capsys.readouterr()
    assert "MAT101" in captured.out
    assert "Matematik" in captured.out


def test_enroll_and_show_student(db_path, capsys):
    run(["--db", db_path, "ogrenci", "ekle", "2024002", "Ayşe", "Kaya"])
    run(["--db", db_path, "ders", "ekle", "FIZ101", "Fizik"])
    run(["--db", db_path, "ders", "kayit", "2024002", "FIZ101"])
    run(["--db", db_path, "ogrenci", "goster", "2024002"])
    captured = capsys.readouterr()
    assert "FIZ101" in captured.out or "Fizik" in captured.out


def test_add_grade_and_average(db_path, capsys):
    run(["--db", db_path, "ogrenci", "ekle", "2024003", "Mehmet", "Demir"])
    run(["--db", db_path, "ders", "ekle", "KIM101", "Kimya"])
    run(["--db", db_path, "not", "ekle", "2024003", "KIM101", "75.0", "--tur", "midterm"])
    run(["--db", db_path, "not", "ekle", "2024003", "KIM101", "85.0", "--tur", "final"])
    run(["--db", db_path, "not", "ortalama", "2024003"])
    captured = capsys.readouterr()
    assert "80.0" in captured.out


def test_attendance_summary(db_path, capsys):
    run(["--db", db_path, "ogrenci", "ekle", "2024004", "Fatma", "Çelik"])
    run(["--db", db_path, "ders", "ekle", "TAR101", "Tarih"])
    run(["--db", db_path, "yoklama", "kaydet", "2024004", "TAR101", "2024-03-01", "present"])
    run(["--db", db_path, "yoklama", "kaydet", "2024004", "TAR101", "2024-03-02", "absent"])
    run(["--db", db_path, "yoklama", "ozet", "2024004", "TAR101"])
    captured = capsys.readouterr()
    assert "50.0" in captured.out


def test_delete_student(db_path, capsys):
    run(["--db", db_path, "ogrenci", "ekle", "2024005", "Selin", "Kurt"])
    run(["--db", db_path, "ogrenci", "sil", "2024005"])
    captured = capsys.readouterr()
    assert "silindi" in captured.out


def test_student_not_found(db_path):
    with pytest.raises(SystemExit):
        run(["--db", db_path, "ogrenci", "goster", "9999"])
