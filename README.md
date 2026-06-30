# OTS — Okul Takip Sistemi

Öğrenci, öğretmen, ders, not ve yoklama yönetimi için Python tabanlı bir okul takip sistemi.

## Özellikler

- **Öğrenci yönetimi** – ekleme, listeleme, güncelleme, silme
- **Öğretmen yönetimi** – ekleme, listeleme, güncelleme, silme
- **Ders yönetimi** – ders ekleme, öğrenci kayıt/iptal, öğrenci listeleme
- **Not takibi** – vize/final/quiz/ödev notları, ders bazında ortalama
- **Yoklama takibi** – günlük var/yok/geç kaydı, devam yüzdesi özeti

## Kurulum

```bash
pip install -e .
```

## Kullanım

```bash
# Öğrenci işlemleri
ots ogrenci ekle 2024001 "Ali" "Yılmaz" --email ali@okul.edu
ots ogrenci listele
ots ogrenci goster 2024001
ots ogrenci sil 2024001

# Öğretmen işlemleri
ots ogretmen ekle "Ahmet" "Yıldız" ahmet@okul.edu --brans Matematik
ots ogretmen listele

# Ders işlemleri
ots ders ekle MAT101 "Matematik" --kredi 4
ots ders listele
ots ders kayit 2024001 MAT101
ots ders ogrenciler MAT101

# Not işlemleri
ots not ekle 2024001 MAT101 85.0 --tur midterm
ots not ekle 2024001 MAT101 90.0 --tur final
ots not ortalama 2024001

# Yoklama işlemleri
ots yoklama kaydet 2024001 MAT101 2024-03-01 present
ots yoklama ozet 2024001 MAT101
```

Varsayılan veritabanı dosyası `ots.db`'dir. Farklı bir dosya için `--db <dosya>` parametresini kullanın.

## Testler

```bash
pip install pytest
pytest tests/
```
