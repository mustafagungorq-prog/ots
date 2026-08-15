# 365 Kuran Kuran Mektebi - PHP + MySQL Backend

## Hazirlanan Dosyalar

| Dosya | Aciklama |
|-------|----------|
| `database/schema.sql` | MySQL veritabani semasi (tum tablolar + ornek veriler) |
| `api/config/database.php` | MySQL baglanti konfigurasyonu |
| `api/config/auth.php` | JWT token bazli kimlik dogrulama |
| `api/index.php` | Ana REST API router (tum CRUD endpointleri) |

## Kurulum Adimlari

### 1. MySQL Veritabani Olusturma

```bash
mysql -u root -p < database/schema.sql
```

Veya phpMyAdmin uzerinden `database/schema.sql` dosyasini import edin.

Varsayilan admin kullanicisi:
- **Kullanici adi:** `admin`
- **Sifre:** `admin123`
- **Rol:** superadmin

### 2. API Konfigurasyonu

`api/config/database.php` dosyasindaki database bilgilerini guncelleyin:

```php
$host = 'localhost';      // MySQL sunucu
$db   = 'kuran_mektebi';  // Veritabani adi
$user = 'root';           // MySQL kullanici adi
$pass = '';               // MySQL sifresi
```

Veya ortam degiskenleri kullanin:
```bash
export DB_HOST=localhost
export DB_NAME=kuran_mektebi
export DB_USER=root
export DB_PASS=sifreniz
```

### 3. PHP Sunucu Yapilandirmasi

**Apache (.htaccess)** - `api/` klasorune:
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]
```

**Nginx** konfigurasyonu:
```nginx
location /api/ {
    try_files $uri $uri/ /api/index.php?$query_string;
}
```

**PHP built-in sunucu** (gelistirme icin):
```bash
cd api && php -S localhost:8000
```

### 4. CORS Ayarlari

Frontend ve backend farkli domainlerdeyse, `api/config/database.php` dosyasindaki CORS header'larini guncelleyin:

```php
header('Access-Control-Allow-Origin: https://sizin-domain.com');
```

## API Endpoint Listesi

### Kimlik Dogrulama
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| POST | `/api/auth/login` | Giris yap, JWT token al |
| GET | `/api/auth/me` | Mevcut kullanici bilgisi |
| POST | `/api/auth/logout` | Cikis yap |

### Kullanicilar
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/users` | Tum kullanicilari listele |
| POST | `/api/users` | Yeni kullanici ekle |
| PUT | `/api/users/{id}` | Kullanici guncelle |
| DELETE | `/api/users/{id}` | Kullanici sil |

**POST /api/users**  
Yetki: `superadmin`, `admin`  
Zorunlu alanlar: `username`, `fullName`, `role`, `password`  
Validation kurallari:
- `username`: en az 3 karakter, sadece harf/rakam/alt cizgi, benzersiz.
- `fullName`: en az 2 karakter.
- `email`: gecerli e-posta formati ve benzersiz (bos olabilir).
- `password`: en az 6 karakter, bcrypt ile hashlenir.
- `role`: `superadmin`, `admin`, `authorized_teacher`, `teacher`, `parent` degerlerinden biri.
- `active`: boolean, varsayilan `true`.

Ornek istek:
```bash
curl -X POST http://localhost:8000/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ahmet_hoca",
    "fullName": "Ahmet Hoca",
    "email": "ahmet@ornek.com",
    "phone": "5551234567",
    "password": "gucluSifre123",
    "role": "teacher",
    "active": true
  }'
```

**PUT /api/users/{id}**  
Yetki: `superadmin`, `admin`  
Gonderilmeyen alanlar degistirilmez. `password` alani bos veya gonderilmezse sifre degismez; gonderilirse en az 6 karakter olmali ve hashlenir. `username` ve `email` diger kayitlarla cakismamalidir.

### Ogrenciler
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/students` | Tum ogrencileri listele |
| GET | `/api/students/{id}` | Ogrenci detayi |
| POST | `/api/students` | Yeni ogrenci ekle |
| PUT | `/api/students/{id}` | Ogrenci guncelle |
| DELETE | `/api/students/{id}` | Ogrenci sil |

### Medreseler (Okullar)
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/schools` | Tum medreseleri listele |
| POST | `/api/schools` | Yeni medrese ekle |
| PUT | `/api/schools/{id}` | Medrese guncelle |
| DELETE | `/api/schools/{id}` | Medrese sil |

### Kurslar
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/courses` | Tum kurslari listele |
| POST | `/api/courses` | Yeni kurs ekle |
| PUT | `/api/courses/{id}` | Kurs guncelle |
| DELETE | `/api/courses/{id}` | Kurs sil |

### Ders Planlari
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/course-schedules` | Tum ders planlarini listele |
| POST | `/api/course-schedules` | Yeni ders plani ekle |
| PUT | `/api/course-schedules/{id}` | Ders plani guncelle |
| DELETE | `/api/course-schedules/{id}` | Ders plani sil |

> `/api/lessons` endpoint'i geriye uyumluluk icin hala calisir; icerik olarak `course_schedules` tablosundan ders planlari dondurur.

### Gruplar (Siniflar)
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/class-rooms` | Tum gruplari listele |
| POST | `/api/class-rooms` | Yeni grup ekle |
| PUT | `/api/class-rooms/{id}` | Grup guncelle |
| DELETE | `/api/class-rooms/{id}` | Grup sil |

### Yoklama
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/attendance` | Yoklama listesi (studentId, classRoomId, date filtresi) |
| POST | `/api/attendance` | Yoklama ekle (artik `classRoomId` ile, `lessonId` kullanilmaz) |
| PUT | `/api/attendance/{id}` | Yoklama guncelle |
| DELETE | `/api/attendance/{id}` | Yoklama sil |

### Gelisim Takibi
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/progress` | Gelisim kayitlari (studentId filtresi) |
| POST | `/api/progress` | Gelisim kaydi ekle |
| PUT | `/api/progress/{id}` | Gelisim kaydi guncelle |
| DELETE | `/api/progress/{id}` | Gelisim kaydi sil |

### Yorumlar
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/comments` | Yorumlari listele (studentId filtresi) |
| POST | `/api/comments` | Yorum ekle |
| DELETE | `/api/comments/{id}` | Yorum sil |

### Ogrenci Raporlari
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/student-reports` | Raporlari listele (studentId filtresi) |
| POST | `/api/student-reports` | Rapor ekle |
| DELETE | `/api/student-reports/{id}` | Rapor sil |

### Anketler
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/surveys` | Anketleri listele |
| POST | `/api/surveys` | Anket ekle |
| DELETE | `/api/surveys/{id}` | Anket sil |
| GET | `/api/survey-questions` | Anket sorulari (surveyId filtresi) |
| POST | `/api/survey-questions` | Anket sorusu ekle |
| DELETE | `/api/survey-questions/{id}` | Anket sorusu sil |
| GET | `/api/survey-answers` | Anket cevaplari |
| POST | `/api/survey-answers` | Anket cevabi ekle |

### Odevler
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/homework-templates` | Odev sablonlarini listele |
| POST | `/api/homework-templates` | Odev sablonu ekle |
| PUT | `/api/homework-templates/{id}` | Odev sablonu guncelle |
| DELETE | `/api/homework-templates/{id}` | Odev sablonu sil |
| GET | `/api/homework-assignments` | Odev atamalarini listele |
| POST | `/api/homework-assignments` | Odev ata |
| PUT | `/api/homework-assignments/{id}` | Odev durumunu guncelle |
| DELETE | `/api/homework-assignments/{id}` | Odev atamasini sil |

### Mufredat
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/curriculum-topics` | Mufredat konularini listele |
| POST | `/api/curriculum-topics` | Mufredat konusu ekle |
| DELETE | `/api/curriculum-topics/{id}` | Mufredat konusu sil |

### Ders Isleme Kayitlari
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/lesson-logs` | Ders isleme kayitlari (studentId filtresi) |
| POST | `/api/lesson-logs` | Ders isleme kaydi ekle |
| DELETE | `/api/lesson-logs/{id}` | Ders isleme kaydi sil |

**POST /api/lesson-logs**  
Zorunlu alanlar: `studentId`, `date`, `category`, `topic`  
`category` degerleri: `ilmihal`, `adab`, `tecvid`, `diger`  
`category` degeri `diger` oldugunda `topic` alani serbest metin olarak kullanilabilir (ornegin: "Kelime Calismasi", "Vecize", "Ruku Egitimi").  
`subTopic` opsiyoneldir; `sub_topic_required` sistem ayari aktifse zorunlu hale gelir.

### Ogretmen-Ders Plani Iliskisi
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/teacher-lessons` | Ogretmen-ders plani atamalari |
| POST | `/api/teacher-lessons` | Ogretmene ders plani ata |
| DELETE | `/api/teacher-lessons/{id}` | Ders plani atamasini kaldir |

> Artik ogretmen atamasi dogrudan `course_schedules` tablosu uzerinden yonetilir. Bu endpoint geriye uyumluluk icin korunmustur.

### Dashboard
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/dashboard` | Istatistikler |

### Yetki Matrisi
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/permission-matrix` | Yetki matrisini listele |
| PUT | `/api/permission-matrix/{id}` | Yetki guncelle |

### Veli-Öğrenci Eşleştirme
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/parent-student-links` | Tüm eşleştirmeleri listele (veli rolünde sadece kendi eşleştirmeleri) |
| POST | `/api/parent-student-links` | Veli ile öğrenciyi eşleştir |
| DELETE | `/api/parent-student-links?parentUserId=X&studentId=Y` | Eşleştirmeyi kaldır |

**POST /api/parent-student-links**  
Yetki: `superadmin`, `admin`  
Zorunlu alanlar: `parentUserId`, `studentId`  
Aynı veli-öğrenci çifti tekrar eklenemez.

**DELETE /api/parent-student-links**  
Yetki: `superadmin`, `admin`  
Query parametreleri: `parentUserId`, `studentId`

## JWT Token Kullanimi

Tum API endpointleri (auth/login haric) `Authorization: Bearer <token>` header'i gerektirir.

### Ornek kullanim:
```bash
# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Response: {"token":"eyJ0eXAi...","user":{"id":1,...}}

# Ogrencileri listele
curl -X GET http://localhost:8000/students \
  -H "Authorization: Bearer eyJ0eXAi..."
```

## Ezber Takip (Memorization)

| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/memorization-texts` | Ezber metinlerini listele |
| POST | `/api/memorization-texts` | Yeni ezber metni ekle (superadmin/admin) |
| PUT | `/api/memorization-texts/{id}` | Ezber metni guncelle (superadmin/admin) |
| DELETE | `/api/memorization-texts/{id}` | Ezber metni sil (superadmin/admin) |
| GET | `/api/memorization-tracking` | Ezber takip kayitlarini listele |
| POST | `/api/memorization-tracking` | Ezber durumu/scores kaydet |
| PUT | `/api/memorization-tracking/{id}` | Ezber kaydi guncelle |
| DELETE | `/api/memorization-tracking/{id}` | Ezber kaydi sil |
| GET | `/api/memorization-tracking/summary?studentId={id}` | **Tek sorguda** ogrenci ozeti: son ezberler, basari orani, tekrar gerekenler, grafik verisi |
| GET | `/api/memorization-criteria` | Puanlama kriterlerini listele |
| POST | `/api/memorization-criteria` | Yeni kriter ekle (superadmin/admin) |
| PUT | `/api/memorization-criteria/{id}` | Kriter guncelle (superadmin/admin) |
| DELETE | `/api/memorization-criteria/{id}` | Kriter sil (superadmin/admin) |

`GET /api/memorization-tracking/summary` endpoint'i tek SQL sorgusu ile ogrenciye ait tum ezber kayitlarini, metin basliklarini ve kontrol eden kisi bilgilerini birlikte getirir; N+1 sorgu olusturmaz.

## Veritabani Tablolari

| Tablo | Aciklama |
|-------|----------|
| `users` | Kullanicilar (superadmin, admin, ogretmen, veli) |
| `schools` | Medreseler |
| `courses` | Kurslar (ders katalogu) |
| `course_schedules` | Ders planlari (kurs + ogretmen + sinif + gun + saat) |
| `class_room_courses` | Sinif-kurs coka-cok iliskisi |
| `student_courses` | Ogrenci-kurs coka-cok iliskisi |
| `class_rooms` | Gruplar (Kudus, Medine, Mekke, Aksa) |
| `students` | Ogrenciler |
| `attendance` | Yoklama kayitlari |
| `progress` | Gelisim takibi |
| `comments` | Yorumlar |
| `reports` | Raporlar |
| `student_reports` | Ogrenci raporlari |
| `surveys` | Anketler |
| `survey_questions` | Anket sorulari |
| `survey_answers` | Anket cevaplari |
| `homework_templates` | Odev sablonlari (`course_id` ile kursa bagli) |
| `homework_assignments` | Odev atamalari |
| `curriculum_topics` | Mufredat konulari (Ilmihal, Adab, Tecvid) |
| `lesson_logs` | Ders isleme kayitlari |
| `parent_student_links` | Veli-ogrenci eslestirmeleri |
| `memorization_texts` | Ezber metinleri |
| `memorization_tracking` | Ogrenci-metin bazli ezber takip kayitlari |
| `memorization_criteria` | Dinamik puanlama kriterleri |
| `grid_column_permissions` | Grid kolon yetkileri |
| `permission_matrix` | Yetki matrisi |

## Guvenlik

- Tum sifreler bcrypt ile hashlenir
- JWT token ile kimlik dogrulama
- Rol bazli yetkilendirme (superadmin, admin, authorized_teacher, teacher, parent)
- SQL injection korumasi (prepared statements)
- CORS destegi
