import argparse
import sys
from ots.database.db import Database
from ots.models.student import Student
from ots.models.teacher import Teacher
from ots.models.course import Course
from ots.models.grade import Grade, Attendance
from ots.services.student_service import StudentService
from ots.services.teacher_service import TeacherService
from ots.services.course_service import CourseService
from ots.services.grade_service import GradeService, AttendanceService


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="ots",
        description="Okul Takip Sistemi - Öğrenci, öğretmen, ders ve not yönetimi",
    )
    parser.add_argument(
        "--db", default="ots.db", help="Veritabanı dosyası (varsayılan: ots.db)"
    )
    subparsers = parser.add_subparsers(dest="command", metavar="<komut>")
    subparsers.required = True

    # --- Öğrenci komutları ---
    student_p = subparsers.add_parser("ogrenci", help="Öğrenci işlemleri")
    student_sub = student_p.add_subparsers(dest="action", metavar="<eylem>")
    student_sub.required = True

    s_add = student_sub.add_parser("ekle", help="Yeni öğrenci ekle")
    s_add.add_argument("no", help="Öğrenci numarası")
    s_add.add_argument("ad", help="Ad")
    s_add.add_argument("soyad", help="Soyad")
    s_add.add_argument("--dogum", help="Doğum tarihi (YYYY-MM-DD)")
    s_add.add_argument("--email", help="E-posta")
    s_add.add_argument("--tel", help="Telefon")

    s_list = student_sub.add_parser("listele", help="Öğrencileri listele")

    s_goster = student_sub.add_parser("goster", help="Öğrenci detayları")
    s_goster.add_argument("no", help="Öğrenci numarası")

    s_sil = student_sub.add_parser("sil", help="Öğrenci sil")
    s_sil.add_argument("no", help="Öğrenci numarası")

    # --- Öğretmen komutları ---
    teacher_p = subparsers.add_parser("ogretmen", help="Öğretmen işlemleri")
    teacher_sub = teacher_p.add_subparsers(dest="action", metavar="<eylem>")
    teacher_sub.required = True

    t_add = teacher_sub.add_parser("ekle", help="Yeni öğretmen ekle")
    t_add.add_argument("ad", help="Ad")
    t_add.add_argument("soyad", help="Soyad")
    t_add.add_argument("email", help="E-posta")
    t_add.add_argument("--tel", help="Telefon")
    t_add.add_argument("--brans", help="Branş")

    teacher_sub.add_parser("listele", help="Öğretmenleri listele")

    t_sil = teacher_sub.add_parser("sil", help="Öğretmen sil")
    t_sil.add_argument("id", type=int, help="Öğretmen ID")

    # --- Ders komutları ---
    course_p = subparsers.add_parser("ders", help="Ders işlemleri")
    course_sub = course_p.add_subparsers(dest="action", metavar="<eylem>")
    course_sub.required = True

    c_add = course_sub.add_parser("ekle", help="Yeni ders ekle")
    c_add.add_argument("kod", help="Ders kodu")
    c_add.add_argument("ad", help="Ders adı")
    c_add.add_argument("--ogretmen", type=int, help="Öğretmen ID")
    c_add.add_argument("--kredi", type=int, default=1, help="Kredi")

    course_sub.add_parser("listele", help="Dersleri listele")

    c_kayit = course_sub.add_parser("kayit", help="Öğrenci ders kaydı")
    c_kayit.add_argument("ogrenci_no", help="Öğrenci numarası")
    c_kayit.add_argument("ders_kodu", help="Ders kodu")

    c_iptal = course_sub.add_parser("iptal", help="Ders kaydı iptali")
    c_iptal.add_argument("ogrenci_no", help="Öğrenci numarası")
    c_iptal.add_argument("ders_kodu", help="Ders kodu")

    c_ogrenciler = course_sub.add_parser("ogrenciler", help="Dersteki öğrenciler")
    c_ogrenciler.add_argument("ders_kodu", help="Ders kodu")

    c_sil = course_sub.add_parser("sil", help="Ders sil")
    c_sil.add_argument("kod", help="Ders kodu")

    # --- Not komutları ---
    grade_p = subparsers.add_parser("not", help="Not işlemleri")
    grade_sub = grade_p.add_subparsers(dest="action", metavar="<eylem>")
    grade_sub.required = True

    g_ekle = grade_sub.add_parser("ekle", help="Not ekle")
    g_ekle.add_argument("ogrenci_no", help="Öğrenci numarası")
    g_ekle.add_argument("ders_kodu", help="Ders kodu")
    g_ekle.add_argument("puan", type=float, help="Puan (0-100)")
    g_ekle.add_argument(
        "--tur",
        default="midterm",
        choices=["midterm", "final", "quiz", "odev"],
        help="Not türü",
    )

    g_listele = grade_sub.add_parser("listele", help="Notları listele")
    g_listele.add_argument("ogrenci_no", help="Öğrenci numarası")
    g_listele.add_argument("--ders", help="Ders kodu (opsiyonel)")

    g_ortalama = grade_sub.add_parser("ortalama", help="Ders ortalamaları")
    g_ortalama.add_argument("ogrenci_no", help="Öğrenci numarası")

    # --- Yoklama komutları ---
    att_p = subparsers.add_parser("yoklama", help="Yoklama işlemleri")
    att_sub = att_p.add_subparsers(dest="action", metavar="<eylem>")
    att_sub.required = True

    a_kaydet = att_sub.add_parser("kaydet", help="Yoklama kaydet")
    a_kaydet.add_argument("ogrenci_no", help="Öğrenci numarası")
    a_kaydet.add_argument("ders_kodu", help="Ders kodu")
    a_kaydet.add_argument("tarih", help="Tarih (YYYY-MM-DD)")
    a_kaydet.add_argument(
        "durum",
        choices=["present", "absent", "late"],
        help="Durum (present/absent/late)",
    )

    a_listele = att_sub.add_parser("listele", help="Yoklama listesi")
    a_listele.add_argument("ogrenci_no", help="Öğrenci numarası")
    a_listele.add_argument("--ders", help="Ders kodu (opsiyonel)")

    a_ozet = att_sub.add_parser("ozet", help="Yoklama özeti")
    a_ozet.add_argument("ogrenci_no", help="Öğrenci numarası")
    a_ozet.add_argument("ders_kodu", help="Ders kodu")

    return parser


def run(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)

    db = Database(args.db)
    student_svc = StudentService(db)
    teacher_svc = TeacherService(db)
    course_svc = CourseService(db)
    grade_svc = GradeService(db)
    att_svc = AttendanceService(db)

    if args.command == "ogrenci":
        _handle_student(args, student_svc, course_svc, grade_svc)
    elif args.command == "ogretmen":
        _handle_teacher(args, teacher_svc)
    elif args.command == "ders":
        _handle_course(args, course_svc, student_svc)
    elif args.command == "not":
        _handle_grade(args, grade_svc, student_svc, course_svc)
    elif args.command == "yoklama":
        _handle_attendance(args, att_svc, student_svc, course_svc)


def _handle_student(args, svc: StudentService, course_svc: CourseService, grade_svc: GradeService):
    if args.action == "ekle":
        student = Student(
            student_no=args.no,
            first_name=args.ad,
            last_name=args.soyad,
            birth_date=getattr(args, "dogum", None),
            email=getattr(args, "email", None),
            phone=getattr(args, "tel", None),
        )
        student = svc.add(student)
        print(f"Öğrenci eklendi: {student}")

    elif args.action == "listele":
        students = svc.list_all()
        if not students:
            print("Kayıtlı öğrenci bulunamadı.")
        else:
            print(f"{'ID':<5} {'No':<12} {'Ad Soyad':<30} {'E-posta':<30}")
            print("-" * 80)
            for s in students:
                print(f"{s.id:<5} {s.student_no:<12} {s.full_name:<30} {s.email or '-':<30}")

    elif args.action == "goster":
        student = svc.get_by_no(args.no)
        if not student:
            print(f"Öğrenci bulunamadı: {args.no}")
            sys.exit(1)
        print(f"Öğrenci: {student}")
        courses = course_svc.get_student_courses(student.id)
        if courses:
            print("Kayıtlı dersler:")
            for c in courses:
                print(f"  {c}")
        averages = grade_svc.get_course_averages(student.id)
        if averages:
            print("Not ortalamaları:")
            for a in averages:
                print(f"  [{a['code']}] {a['name']}: {a['average']:.1f}")

    elif args.action == "sil":
        student = svc.get_by_no(args.no)
        if not student:
            print(f"Öğrenci bulunamadı: {args.no}")
            sys.exit(1)
        svc.delete(student.id)
        print(f"Öğrenci silindi: {student}")


def _handle_teacher(args, svc: TeacherService):
    if args.action == "ekle":
        teacher = Teacher(
            first_name=args.ad,
            last_name=args.soyad,
            email=args.email,
            phone=getattr(args, "tel", None),
            branch=getattr(args, "brans", None),
        )
        teacher = svc.add(teacher)
        print(f"Öğretmen eklendi: {teacher}")

    elif args.action == "listele":
        teachers = svc.list_all()
        if not teachers:
            print("Kayıtlı öğretmen bulunamadı.")
        else:
            print(f"{'ID':<5} {'Ad Soyad':<30} {'E-posta':<30} {'Branş':<20}")
            print("-" * 88)
            for t in teachers:
                print(
                    f"{t.id:<5} {t.full_name:<30} {t.email:<30} {t.branch or '-':<20}"
                )

    elif args.action == "sil":
        ok = svc.delete(args.id)
        if ok:
            print(f"Öğretmen silindi (ID: {args.id})")
        else:
            print(f"Öğretmen bulunamadı (ID: {args.id})")
            sys.exit(1)


def _handle_course(args, svc: CourseService, student_svc: StudentService):
    if args.action == "ekle":
        course = Course(
            code=args.kod,
            name=args.ad,
            teacher_id=getattr(args, "ogretmen", None),
            credits=getattr(args, "kredi", 1),
        )
        course = svc.add(course)
        print(f"Ders eklendi: {course}")

    elif args.action == "listele":
        courses = svc.list_all()
        if not courses:
            print("Kayıtlı ders bulunamadı.")
        else:
            print(f"{'ID':<5} {'Kod':<12} {'Ad':<40} {'Kredi':<8}")
            print("-" * 68)
            for c in courses:
                print(f"{c.id:<5} {c.code:<12} {c.name:<40} {c.credits:<8}")

    elif args.action == "kayit":
        student = student_svc.get_by_no(args.ogrenci_no)
        if not student:
            print(f"Öğrenci bulunamadı: {args.ogrenci_no}")
            sys.exit(1)
        course = svc.get_by_code(args.ders_kodu)
        if not course:
            print(f"Ders bulunamadı: {args.ders_kodu}")
            sys.exit(1)
        ok = svc.enroll_student(student.id, course.id)
        if ok:
            print(f"{student.full_name} → {course.name} dersine kaydedildi.")
        else:
            print("Kayıt zaten mevcut.")

    elif args.action == "iptal":
        student = student_svc.get_by_no(args.ogrenci_no)
        if not student:
            print(f"Öğrenci bulunamadı: {args.ogrenci_no}")
            sys.exit(1)
        course = svc.get_by_code(args.ders_kodu)
        if not course:
            print(f"Ders bulunamadı: {args.ders_kodu}")
            sys.exit(1)
        ok = svc.unenroll_student(student.id, course.id)
        if ok:
            print(f"{student.full_name} → {course.name} ders kaydı iptal edildi.")
        else:
            print("Kayıt bulunamadı.")

    elif args.action == "ogrenciler":
        course = svc.get_by_code(args.ders_kodu)
        if not course:
            print(f"Ders bulunamadı: {args.ders_kodu}")
            sys.exit(1)
        student_ids = svc.get_enrolled_students(course.id)
        if not student_ids:
            print(f"{course.name} dersine kayıtlı öğrenci yok.")
        else:
            print(f"{course.name} dersine kayıtlı öğrenciler ({len(student_ids)}):")
            for sid in student_ids:
                student = student_svc.get(sid)
                if student:
                    print(f"  {student}")

    elif args.action == "sil":
        course = svc.get_by_code(args.kod)
        if not course:
            print(f"Ders bulunamadı: {args.kod}")
            sys.exit(1)
        svc.delete(course.id)
        print(f"Ders silindi: {course}")


def _handle_grade(args, svc: GradeService, student_svc: StudentService, course_svc: CourseService):
    if args.action == "ekle":
        student = student_svc.get_by_no(args.ogrenci_no)
        if not student:
            print(f"Öğrenci bulunamadı: {args.ogrenci_no}")
            sys.exit(1)
        course = course_svc.get_by_code(args.ders_kodu)
        if not course:
            print(f"Ders bulunamadı: {args.ders_kodu}")
            sys.exit(1)
        if not (0 <= args.puan <= 100):
            print("Puan 0-100 arasında olmalıdır.")
            sys.exit(1)
        grade = Grade(
            student_id=student.id,
            course_id=course.id,
            grade=args.puan,
            grade_type=args.tur,
        )
        svc.add_grade(grade)
        print(f"{student.full_name} → {course.name}: {args.puan} ({args.tur}) notu eklendi.")

    elif args.action == "listele":
        student = student_svc.get_by_no(args.ogrenci_no)
        if not student:
            print(f"Öğrenci bulunamadı: {args.ogrenci_no}")
            sys.exit(1)
        course_id = None
        if args.ders:
            course = course_svc.get_by_code(args.ders)
            if not course:
                print(f"Ders bulunamadı: {args.ders}")
                sys.exit(1)
            course_id = course.id
        grades = svc.get_student_grades(student.id, course_id)
        if not grades:
            print("Not bulunamadı.")
        else:
            for g in grades:
                print(f"  Ders ID:{g.course_id} | {g}")

    elif args.action == "ortalama":
        student = student_svc.get_by_no(args.ogrenci_no)
        if not student:
            print(f"Öğrenci bulunamadı: {args.ogrenci_no}")
            sys.exit(1)
        averages = svc.get_course_averages(student.id)
        if not averages:
            print("Not bulunamadı.")
        else:
            print(f"{student.full_name} not ortalamaları:")
            for a in averages:
                print(f"  [{a['code']}] {a['name']}: {a['average']:.1f}")


def _handle_attendance(
    args, svc: AttendanceService, student_svc: StudentService, course_svc: CourseService
):
    if args.action == "kaydet":
        student = student_svc.get_by_no(args.ogrenci_no)
        if not student:
            print(f"Öğrenci bulunamadı: {args.ogrenci_no}")
            sys.exit(1)
        course = course_svc.get_by_code(args.ders_kodu)
        if not course:
            print(f"Ders bulunamadı: {args.ders_kodu}")
            sys.exit(1)
        att = Attendance(
            student_id=student.id,
            course_id=course.id,
            date=args.tarih,
            status=args.durum,
        )
        svc.record(att)
        status_map = {"present": "Var", "absent": "Yok", "late": "Geç"}
        print(
            f"{student.full_name} → {course.name} | {args.tarih}: {status_map[args.durum]}"
        )

    elif args.action == "listele":
        student = student_svc.get_by_no(args.ogrenci_no)
        if not student:
            print(f"Öğrenci bulunamadı: {args.ogrenci_no}")
            sys.exit(1)
        course_id = None
        if args.ders:
            course = course_svc.get_by_code(args.ders)
            if not course:
                print(f"Ders bulunamadı: {args.ders}")
                sys.exit(1)
            course_id = course.id
        records = svc.get_student_attendance(student.id, course_id)
        if not records:
            print("Yoklama kaydı bulunamadı.")
        else:
            for r in records:
                print(f"  Ders ID:{r.course_id} | {r}")

    elif args.action == "ozet":
        student = student_svc.get_by_no(args.ogrenci_no)
        if not student:
            print(f"Öğrenci bulunamadı: {args.ogrenci_no}")
            sys.exit(1)
        course = course_svc.get_by_code(args.ders_kodu)
        if not course:
            print(f"Ders bulunamadı: {args.ders_kodu}")
            sys.exit(1)
        summary = svc.get_attendance_summary(student.id, course.id)
        print(f"{student.full_name} → {course.name} yoklama özeti:")
        print(f"  Var    : {summary['present']}")
        print(f"  Yok    : {summary['absent']}")
        print(f"  Geç    : {summary['late']}")
        print(f"  Devam  : %{summary['attendance_rate']}")
