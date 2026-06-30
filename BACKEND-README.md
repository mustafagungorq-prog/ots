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

### Dersler
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/lessons` | Tum dersleri listele |
| POST | `/api/lessons` | Yeni ders ekle |
| PUT | `/api/lessons/{id}` | Ders guncelle |
| DELETE | `/api/lessons/{id}` | Ders sil |

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
| GET | `/api/attendance` | Yoklama listesi (studentId, date filtresi) |
| POST | `/api/attendance` | Yoklama ekle |
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

### Ogretmen-Ders Iliskisi
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/teacher-lessons` | Ogretmen-ders atamalari |
| POST | `/api/teacher-lessons` | Ogretmene ders ata |
| DELETE | `/api/teacher-lessons/{id}` | Ders atamasini kaldir |

### Dashboard
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/dashboard` | Istatistikler |

### Yetki Matrisi
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/permission-matrix` | Yetki matrisini listele |
| PUT | `/api/permission-matrix/{id}` | Yetki guncelle |

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

## Veritabani Tablolari

| Tablo | Aciklama |
|-------|----------|
| `users` | Kullanicilar (superadmin, admin, ogretmen, veli) |
| `schools` | Medreseler |
| `lessons` | Dersler |
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
| `homework_templates` | Odev sablonlari |
| `homework_assignments` | Odev atamalari |
| `curriculum_topics` | Mufredat konulari (Ilmihal, Adab, Tecvid) |
| `lesson_logs` | Ders isleme kayitlari |
| `teacher_lessons` | Ogretmen-ders atamalari |
| `grid_column_permissions` | Grid kolon yetkileri |
| `permission_matrix` | Yetki matrisi |

## Guvenlik

- Tum sifreler bcrypt ile hashlenir
- JWT token ile kimlik dogrulama
- Rol bazli yetkilendirme (superadmin, admin, authorized_teacher, teacher, parent)
- SQL injection korumasi (prepared statements)
- CORS destegi
