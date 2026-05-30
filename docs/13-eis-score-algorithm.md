# 13. EIS Score Algorithm

Tujuan utama sistem ini adalah menghitung Educational Impact Score (EIS) sebagai kesimpulan akhir kunjungan wisatawan. Logika perhitungannya dipisahkan dari layer Database query untuk memastikan isolasi fungsi fungsional (pure functions) di utilitas.

## Parameter Nilai Agregat
EIS memperhitungkan 3 area yang beroperasi secara persentase berbeda dari nilai max 100:
1. **Knowledge Gain** (Bobot: `40%` / `0.4`) - Perolehan nilai pengetahuan setelah berkunjung dibanding sebelum masuk.
2. **Engagement** (Bobot: `35%` / `0.35`) - Daya tahan konsumsi media, kunjungan exhibit, dan penyelesaian gim mini interaktif.
3. **Retention** (Bobot: `25%` / `0.25`) - Daya ingat memori ilmu jangka panjang setelah H+7 atau H+30 hari.

### Formula Final
```
final_eis_score = (knowledgeGainScore × 0.40) + (engagementScore × 0.35) + (retentionScore × 0.25)
```

## Rincian Perhitungan Komponen

### 1. Knowledge Gain (`calculateKnowledgeGain`)
Skala nilai absolut maksimal: 100.
```javascript
export function calculateKnowledgeGain(preScore, postScore) {
  // Hasil adalah delta dari tes setelah dikurangi tes sebelum kunjungan.
  const gain = postScore - preScore;
  // Jika hasilnya regress (memburuk/negatif), set ke 0.
  return gain > 0 ? gain : 0;
}
```

### 2. Engagement Score (`calculateEngagementScore`)
Terdiri dari perolehan koin/poin dari durasi, exhibit, ragam tipe media, dan lab.
- **Durasi (Maks 50 Poin):** Setiap 5 menit (300 Detik) mendatangkan 1 Poin.
- **Exhibit (Maks 20 Poin):** Setiap satu lokasi exhibit yang sah di check-in mendatangkan 2 Poin.
- **Media (Maks 20 Poin):** Semakin beragam media yang disentuh (Audio, Video, dsb), dihargai 5 Poin per *unique type*.
- **Interactive Lab (Bonus 10 Poin):** Apabila menyentuh satupun aktivitas mini games di dalam.

```javascript
export function calculateEngagementScore(durationSeconds, exhibitsVisited, mediaClicked, hasLabActivity) {
  const durationPoints = Math.min(50, Math.floor(durationSeconds / 300));
  const exhibitPoints = Math.min(20, exhibitsVisited * 2);
  
  // Asumsi mediaClicked = jumlah 'UNIQUE MediaType' yang di klik = Maks 4 jenis.
  const mediaPoints = Math.min(20, mediaClicked * 5); 
  const labBonus = hasLabActivity ? 10 : 0;
  
  // Total gabungan, dengan batas atap keras (hard cap) 100.
  return Math.min(100, durationPoints + exhibitPoints + mediaPoints + labBonus);
}
```

### 3. Retention Score (`calculateRetentionScore`)
Retensi tidak merugikan pengunjung jika mereka belum menerima waktunya.
```javascript
export function calculateRetentionScore(score1w, score1m) {
  // Jika pengunjung telah menyelesaikan dan menabung kedua kuis.
  if (score1w !== null && score1w !== undefined && score1m !== null && score1m !== undefined) {
    return Math.round((score1w + score1m) / 2);
  }
  
  // Jika baru H+7 selesai (1W ada, 1M belum).
  if (score1w !== null && score1w !== undefined) {
    return Math.round(score1w * 0.5); 
  }
  
  // Jika belum mengerjakan satupun atau belum jatuh tempo.
  return 0;
}
```

### 4. Menghitung EIS Total (`calculateFinalEis`)
```javascript
export function calculateFinalEis(knowledgeGain, engagement, retention) {
  const final = (knowledgeGain * 0.40) + (engagement * 0.35) + (retention * 0.25);
  return Math.round(final); // Pembulatan utuh integer
}
```

### 5. Pemberian Predikat Lencana (`assignGrade`)
Diberikan pada layar konklusi rapor pengunjung.
```javascript
export function assignGrade(finalScore) {
  if (finalScore >= 90) return { grade: 'S', badge: 'Naturalis Master' };
  if (finalScore >= 75) return { grade: 'A', badge: 'Penjelajah Konservasi' };
  if (finalScore >= 60) return { grade: 'B', badge: 'Pengamat Satwa' };
  if (finalScore >= 45) return { grade: 'C', badge: 'Pengunjung Aktif' };
  return { grade: 'D', badge: 'Penjelajah Pemula' };
}
```

## Kapan Engine `recalculateEis` Di-Trigger?
Skor Final DB EIS harus selalu di-*refresh* penyegarannya setiap kali kriteria barunya dikumpulkan pengguna, yakni di rute berikut:
1. Setelah pengguna Submit `POST_ZOO` Kuis. (Karena ini pertanda kalkulasi Knowledge dan Engagement di penghujung sesi visit sudah fixed).
2. Setelah pengguna memencet Submit `RETENTION_1W`.
3. Setelah pengguna memencet Submit `RETENTION_1M`.
Di-trigger lewat asinkronasi non-blocking `recalculateEis(userId, sessionId).catch(console.error)` pada masing-masing layer *Service* yang bersangkutan.
