# 👶 Penentuan Kategori Umur Pengunjung — docs/features/01-utilities/02-age-category.md

**Status**: ✅ Selesai | **Priority Order**: #1.2

---

## 📌 Deskripsi Fitur
Pembelajaran interaktif di kebun binatang di bawah naungan **EIS Engine** disajikan secara adaptif menyesuaikan usia pengunjung. Demi menjaga konsistensi penggolongan umur dari proses registrasi, penyajian materi kandang satwa, penyajian kuis, hingga kalkulasi EIS Score, backend menyediakan helper penentuan kategori umur terpusat.

Fungsi helper `determineAgeCategory` bertugas membaca angka umur riil pengunjung dan memetakannya secara deterministik ke dalam salah satu label kategori umur: **`CHILD`** (Anak-anak), **`TEEN`** (Remaja), atau **`ADULT`** (Dewasa).

---

## ⚙️ Rincian Logika Penggolongan Usia

Penentuan kategori umur diklasifikasikan menggunakan aturan rentang angka usia berikut:

| Batas Usia Riil (Tahun) | Label Kategori | Keterangan Target |
| :--- | :---: | :--- |
| **Kurang dari 12 tahun** (`age < 12`) | **`CHILD`** | Edukasi ramah anak, berorientasi audio interaktif visual. |
| **Mulai dari 12 hingga 17 tahun** (`12 <= age < 18`) | **`TEEN`** | Edukasi semi-formal, sains konservasi dasar. |
| **18 tahun ke atas** (`age >= 18`) | **`ADULT`** | Analisis konservasi satwa mendalam dan literasi kognitif tinggi. |

---

## 🛠️ Referensi Implementasi Kode

Fungsi diimplementasikan secara ringkas dan efisien pada [ageCategory.js](file:///home/rafi/Documents/tugas-kuliah/semester4/software%20engginer%20prak/EIS-engine/src/utils/ageCategory.js):

```javascript
export const determineAgeCategory = (age) => {
  if (age < 12) return 'CHILD';
  if (age < 18) return 'TEEN';
  return 'ADULT';
};
```

---

## 🏆 Aturan Bisnis (Business Rules)

1. **Determinisme Mutlak (Strict Deterministic Evaluation):**
   Fungsi ini bersifat deterministik (selalu menghasilkan output kategori yang sama untuk input angka yang sama) untuk menghindari ketidakcocokan kategori konten edukasi saat pengunjung scan kandang satwa.
2. **Kesesuaian Validasi Skema Pengguna (User Schema Alignment):**
   Output label dari fungsi ini disesuaikan dengan tipe enum database (`AgeCategory`) untuk mencegah error ketidakcocokan tipe (*type mismatch*) saat data profil pengguna disimpan oleh Prisma ke database.
3. **Penggunaan Luas Lintas Fitur (Cross-Feature Dependency):**
   Kategori umur ini dimanfaatkan oleh:
   * **`POST /api/v1/users/register`:** Untuk mengklasifikasikan akun pengunjung sesaat setelah registrasi sukses.
   * **`GET /api/v1/quizzes/fetch`:** Untuk menarik lembar soal kuis (PRE/POST) yang sesuai dengan kategori umur pengunjung.
   * **`POST /api/v1/track/checkin`:** Untuk menyuguhkan konten teks sains kandang adaptif.
