# 🔗 Pembuatan & Verifikasi Token Kuis Retensi — docs/features/01-utilities/04-token-url.md

**Status**: ✅ Selesai | **Priority Order**: #1.4

---

## 📌 Deskripsi Fitur
Sistem kuis retensi ingatan jangka panjang (H+7 dan H+30) dikirimkan secara otomatis ke alamat email pengunjung melalui scheduler cron. Untuk menyuguhkan kemudahan pengisian kuis tanpa membebani pengunjung dengan kewajiban melakukan login/autentikasi ulang yang merepotkan (yang dapat menurunkan antusiasme belajar), **EIS Engine** menerapkan alur kuis tanpa sandi (*passwordless*).

Modul helper `src/utils/tokenUrl.js` bertugas untuk memfasilitasi pembuatan enkripsi token kuis retensi yang aman berbasis **JSON Web Token (JWT)**. Token ini disematkan di dalam tautan kuis email dan dapat divalidasi secara asinkron untuk memuat sesi belajar tanpa celah kebocoran keamanan.

---

## ⚙️ Rincian Logika Token Keamanan

JWT kuis retensi mengenkripsi data payload penting kunjungan pengunjung ke dalam satu string token terenkripsi.

* **Payload Enkripsi:**
  * `userId`: ID pengunjung pemilik kuis.
  * `sessionId`: ID sesi kunjungan yang dievaluasi daya ingatnya.
  * `quizType`: Tipe kuis retensi yang dievaluasi (`RETENTION_1W` atau `RETENTION_1M`).
* **Masa Berlaku Token:** **Tepat 24 Jam** sejak kuis dikirimkan. Setelah 24 jam, token otomatis tidak sah (*expired*).
* **Kunci Rahasia Enkripsi:** Memanfaatkan variabel `.env` khusus `RETENTION_TOKEN_SECRET`.

---

## 🛠️ Referensi Implementasi Kode

Komponen token keamanan diimplementasikan pada [tokenUrl.js](file:///home/rafi/Documents/tugas-kuliah/semester4/software%20engginer%20prak/EIS-engine/src/utils/tokenUrl.js):

### 1. Pembangkit Enkripsi Token (`generateRetentionToken`)
Menyusun payload transaksi kunjungan pengunjung dan menandatanganinya menggunakan JWT dengan masa kadaluarsa 24 jam.

```javascript
import jwt from 'jsonwebtoken';

export const generateRetentionToken = (userId, sessionId, quizType) => {
  return jwt.sign(
    { userId, sessionId, quizType },
    process.env.RETENTION_TOKEN_SECRET,
    { expiresIn: '24h' }
  );
};
```

### 2. Verifikasi Keabsahan Token (`verifyRetentionToken`)
Melakukan dekripsi token yang dikirimkan lewat URL parameter. Jika token telah kadaluarsa (>24 jam) atau kunci rahasia salah, sistem menangkap error dan mengembalikan nilai `null`.

```javascript
export const verifyRetentionToken = (token) => {
  try {
    return jwt.verify(token, process.env.RETENTION_TOKEN_SECRET);
  } catch (error) {
    return null;
  }
};
```

---

## 🏆 Aturan Bisnis (Business Rules)

1. **Kebijakan Batasan Kedaluwarsa Ketat (24-Hour Strict Expiry Policy):**
   Kuis retensi ingatan dirancang untuk menguji daya ingat segar pengunjung di waktu yang tepat. Oleh sebab itu, token dibatasi kadaluarsanya selama **24 jam** sejak dikirimkan. Token yang lewat dari batas waktu tersebut otomatis dianggap tidak sah, memaksa client untuk memblokir pengerjaan kuis.
2. **Kerahasiaan Kunci Kriptografi (Isolated Key Security):**
   Kunci enkripsi kuis retensi dibedakan secara penuh dari kunci otentikasi login utama (`RETENTION_TOKEN_SECRET` vs `JWT_SECRET`). Hal ini dilakukan agar apabila terjadi kebocoran token kuis pada inbox email pengunjung, akun utama pengunjung tetap terlindungi dari pembajakan identitas.
3. **Ketergantungan Alur Kuis Retensi (Retention Flow Dependency):**
   Fungsi ini dipicu secara khusus pada:
   * **`POST /api/v1/retention/trigger`:** Dipanggil oleh scheduler cron untuk membuat token URL saat email dikirimkan.
   * **`GET /api/v1/retention/quiz/:token`:** Dipanggil saat pengunjung mengklik link email untuk mengambil daftar soal kuis.
   * **`POST /api/v1/retention/submit/:token`:** Dipanggil saat pengunjung mengirimkan jawaban kuis untuk dinilai secara otomatis di database.
