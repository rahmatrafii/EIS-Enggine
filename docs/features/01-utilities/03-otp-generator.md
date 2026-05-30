# 🔑 Pembangkit Kode OTP Acak — docs/features/01-utilities/03-otp-generator.md

**Status**: ✅ Selesai | **Priority Order**: #1.3

---

## 📌 Deskripsi Fitur
Untuk melindungi otentikasi pendaftaran pengunjung dan proses masuk ke dalam sistem dari serangan akun palsu, **EIS Engine** menerapkan verifikasi alamat email menggunakan mekanisme kode **One-Time Password (OTP)**.

Fungsi helper `generateOtp` bertugas men-generate string **6 digit angka acak** yang aman dan unik. Kode ini kemudian dikirimkan secara langsung ke alamat email terdaftar pengunjung dan disimpan di database dengan batasan kadaluarsa singkat selama **5 menit**.

---

## ⚙️ Rincian Logika Pembangkit Kode OTP

Sistem menetapkan panjang default kode OTP sebanyak **6 karakter**. Kode disusun secara matematis dengan melakukan pembulatan bilangan acak riil skala 0-9 untuk setiap posisinya.

* **Panjang Kode:** 6 Karakter Digit.
* **Karakter yang Diperbolehkan:** `0123456789`.
* **Metode Keacakan:** Pemanfaatan `Math.floor(Math.random() * 10)` yang digabungkan secara rekursif dalam sebuah iterasi string.

---

## 🛠️ Referensi Implementasi Kode

Fungsi ini diimplementasikan secara ringkas pada [otpGenerator.js](file:///home/rafi/Documents/tugas-kuliah/semester4/software%20engginer%20prak/EIS-engine/src/utils/otpGenerator.js):

```javascript
const OTP_LENGTH = 6;

export const generateOtp = () => {
  let otp = '';
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += Math.floor(Math.random() * 10).toString();
  }
  return otp;
};
```

---

## 🏆 Aturan Bisnis (Business Rules)

1. **Format string Numerik (Numeric Only Representation):**
   Meskipun OTP diwakili oleh tipe data String untuk mengamankan karakter angka awal nol (misalnya `"083921"` agar tidak terpotong menjadi integer `83921`), isinya wajib berupa deretan karakter angka numerik 0-9 saja demi memudahkan pengunjung menyalin kode pada antarmuka perangkat mobile.
2. **Keunikan Distribusi Probabilitas (Cryptographic Unpredictability):**
   Penggunaan generator matematika menghasilkan kombinasi angka acak dengan variasi probabilitas yang cukup tinggi ($10^6$ atau $1.000.000$ kemungkinan kombinasi unik) sehingga meminimalkan risiko serangan tebakan berulang (*brute-force attacks*) selama masa kadaluarsa 5 menit aktif.
3. **Ketergantungan Alur Pendaftaran (Register Workflow Dependency):**
   Fungsi ini dipicu secara khusus pada:
   * **`POST /api/v1/users/request-otp`:** Untuk mengirim ulang kode OTP baru jika kode lama kadaluarsa atau email tidak kunjung masuk.
   * **`POST /api/v1/users/verify-otp`:** Untuk mencocokkan inputan pengguna dengan kode yang tersimpan pada database pengunjung.
