# 📨 Helper Pengiriman Email (Nodemailer) — docs/features/01-utilities/06-email-sender.md

**Status**: ✅ Selesai | **Priority Order**: #1.6

---

## 📌 Deskripsi Fitur
Komunikasi asinkron jarak jauh dengan pengunjung (seperti pengiriman kode OTP pendaftaran serta pengiriman kuis retensi ingatan jangka panjang H+7 dan H+30) digerakkan secara otomatis oleh server backend menggunakan media pesan elektronik (Email).

Fungsi helper `sendEmail` menyediakan abstraksi pemanggilan pustaka **Nodemailer** yang dikonfigurasikan dengan SMTP (*Simple Mail Transfer Protocol*) terpusat. Ini memungkinkan pengiriman pesan email berformat kaya (HTML) dengan konfigurasi dinamis berbasis variabel lingkungan `.env`.

---

## ⚙️ Rincian Konfigurasi SMTP

Sistem memuat setelan akun pengirim email terpusat lewat berkas konfigurasi `.env`:

| Variabel Lingkungan | Deskripsi Setelan |
| :--- | :--- |
| **`EMAIL_HOST`** | Alamat server SMTP pengirim (misal `smtp.gmail.com` atau SMTP sandbox mailtrap). |
| **`EMAIL_PORT`** | Port koneksi SMTP (misal `587` untuk koneksi TLS aman atau `465` untuk SSL). |
| **`EMAIL_USER`** | Username otentikasi akun SMTP pengirim. |
| **`EMAIL_PASS`** | Password / *App Password* khusus SMTP pengirim. |
| **`EMAIL_FROM`** | Alamat email resmi pengirim yang tertera di inbox pengunjung. |

---

## 🛠️ Referensi Implementasi Kode

Komponen pengiriman email diimplementasikan secara bersih pada [emailSender.js](file:///home/rafi/Documents/tugas-kuliah/semester4/software%20engginer%20prak/EIS-engine/src/utils/emailSender.js):

```javascript
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

/**
 * Mengirim email menggunakan Nodemailer
 * @param {{ to: string, subject: string, html: string }} options
 */
export async function sendEmail({ to, subject, html }) {
  const info = await transporter.sendMail({
    from: `"EIS Engine" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  })

  return info
}
```

---

## 🏆 Aturan Bisnis (Business Rules)

1. **Dukungan Format HTML Kaya (Rich HTML Support):**
   Mengingat email kuis retensi menyematkan tombol (*call-to-action*) dan teks sambutan ramah, parameter pesan wajib dikirimkan dalam format standardisasi dokumen `html` (bukan string plain text biasa) agar klien email pengunjung (seperti Gmail, Outlook, Apple Mail) dapat merender tombol link pengerjaan kuis retensi secara visual.
2. **Koneksi TLS Aman Berkecepatan Tinggi (Secure Non-Blocking TLS):**
   Pengiriman diatur menggunakan parameter `secure: false` namun terikat pada port `587` (TLS upgradeable via STARTTLS). Ini menjamin pertukaran kunci enkripsi antara server backend dan server email berlangsung aman dan cepat.
3. **Isolasi Kegagalan Iterasi Pengiriman (Isolated Loop Protection):**
   Pada pengiriman email kuis retensi massal oleh scheduler (Fase 7), pemanggilan helper `sendEmail` dibungkus di dalam blok pengaman `try-catch` terisolasi di tiap-tiap iterasi data pengunjung. Jika terjadi kegagalan koneksi internet pada 1 pengunjung (misalnya email tidak valid), **sistem tidak crash** dan proses pengiriman kuis tetap berlanjut lancar ke pengunjung berikutnya.
