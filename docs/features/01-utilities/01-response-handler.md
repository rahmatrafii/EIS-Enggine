# ✉️ Response Handler & Kustomisasi Error — docs/features/01-utilities/01-response-handler.md

**Status**: ✅ Selesai | **Priority Order**: #1.1

---

## 📌 Deskripsi Fitur
Untuk menjamin kenyamanan integrasi client-side (Frontend / Mobile App) serta memudahkan pembacaan logs, sistem backend **EIS Engine** menerapkan arsitektur standarisasi format response sukses dan penanganan error.

Modul helper `src/utils/response.js` bertugas membungkus JSON API response agar memiliki struktur data yang seragam secara universal, menyaring properti kosong (`null` filter), dan memfasilitasi kustomisasi kelas error (`AppError`) ber-status code khusus yang terikat ke sistem log penanganan error terpusat.

---

## ⚙️ Rincian API Format Standardisasi

### 1. Struktur Respon Sukses (Standard Success Payload)
Semua API response dengan status HTTP 2xx dibungkus menggunakan fungsi helper `sendSuccess`.
```json
{
  "success": true,
  "message": "Pesan informasi sukses tindakan",
  "data": { ... }
}
```

### 2. Struktur Respon Error (Standard Error Payload)
Semua API response dengan status HTTP 4xx / 5xx dibungkus menggunakan fungsi helper `sendError` (yang secara otomatis dipanggil oleh Central Error Middleware).
```json
{
  "success": false,
  "code": "ERROR_CODE_IDENTIFIER",
  "message": "Detail pesan deskripsi kegagalan tindakan"
}
```

---

## 🛠️ Referensi Implementasi Kode

Sistem mengimplementasikan 3 komponen utama pada [response.js](file:///home/rafi/Documents/tugas-kuliah/semester4/software%20engginer%20prak/EIS-engine/src/utils/response.js):

### 1. Kustomisasi Error Class (`AppError`)
Merupakan turunan kelas `Error` bawaan JavaScript. Membantu melemparkan error taktis ber-status code khusus dan identitas string error code yang dibersihkan dari *blind debugging*.

```javascript
export class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### 2. Sukses Response Helper (`sendSuccess`)
Menerima object `data` dan secara cerdas menyaring properti bernilai `null` agar berubah menjadi `undefined` (sehingga terhapus dari serialisasi JSON stringify untuk menghemat bandwith jaringan internet).

```javascript
export const sendSuccess = (res, statusCode, data, message = 'Success') => {
  const cleanedData = JSON.parse(JSON.stringify(data, (key, value) => {
    return value === null ? undefined : value;
  }));

  return res.status(statusCode).json({
    success: true,
    message,
    data: cleanedData
  });
};
```

### 3. Gagal Response Helper (`sendError`)
Menyuguhkan payload standardisasi error seragam berisikan status code, kode error representatif, serta deskripsi pesan ramah pengguna.

```javascript
export const sendError = (res, statusCode, code, message) => {
  return res.status(statusCode).json({
    success: false,
    code,
    message
  });
};
```

---

## 🏆 Aturan Bisnis (Business Rules)

1. **Penyaringan Bandwidth Kunci Null (Null Key Stripping Policy):**
   Untuk menjaga kebersihan data payload dan menekan penggunaan kuota internet mobile client, properti bernilai `null` (misalnya kandang tanpa description `description: null`) secara otomatis dibersihkan dari JSON response di dalam helper `sendSuccess` dengan memanfaatkan filter rekursif serialisasi JSON.
2. **Kepatuhan Penanganan Stack Trace (Secure Error Capture):**
   Kelas kustom `AppError` mengamankan stack trace aslinya menggunakan `Error.captureStackTrace` sehingga saat error dilempar di dalam controller / service, logging server dapat melacak baris kegagalan secara presisi di terminal backend tanpa harus menampilkan stack trace tersebut kepada pengunjung umum (demi keamanan privasi sistem).
