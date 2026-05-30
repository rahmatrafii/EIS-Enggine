# Prisma Schema Documentation

Dokumentasi ini menjelaskan secara komprehensif skema Prisma yang digunakan dalam aplikasi EIS Engine. File ini menjadi referensi struktur database dan tata cara penggunaan Prisma.

## Aturan Field Mapping (`@@map`, `@map`)
Kami menggunakan `@@map` (untuk tabel) dan `@map` (untuk kolom) guna memastikan kepatuhan terhadap konvensi penamaan standar database (snake_case) sekaligus tetap mempertahankan konvensi penamaan camelCase di level kode JavaScript. Hal ini membuat query ORM menjadi elegan dan menghindari kejanggalan penulisan pada JavaScript.

- `@@map("table_name")`: Menyelaraskan nama model Prisma dengan nama tabel di database.
- `@map("column_name")`: Menyelaraskan properti di model Prisma dengan nama kolom di tabel database.

## Operasi Prisma
### Menjalankan Migrasi
Karena kita menggunakan Supabase, maka disarankan untuk menggunakan perintah `db push` untuk sinkronisasi schema di env development:
```bash
npx prisma db push
```

Jika memerlukan pembuatan file migrasi, gunakan:
```bash
npx prisma migrate dev --name init
```

### Melakukan Generate Client
Setelah melakukan perubahan schema, perbarui Prisma Client dengan perintah:
```bash
npx prisma generate
```

### Prisma Studio
Untuk melihat, menambahkan, atau mengubah data pada database menggunakan antarmuka grafis yang disediakan Prisma:
```bash
npx prisma studio
```

## Daftar Model dan Penjelasan
- **User**: Menyimpan data seluruh pengunjung atau admin, dilengkapi dengan info OTP untuk login.
- **Exhibit**: Detail setiap lokasi atau kandang, termasuk properti identifikasi QR code.
- **ExhibitMedia**: Kumpulan data media file yang digunakan di dalam exhibit, disesuaikan berdasarkan usia pengunjung.
- **LearningPathContent**: Materi pembelajaran dan informasi untuk pengunjung yang difilter per kategori usia.
- **VisitSession**: Rekaman setiap sesi kunjungan user dari mulai check-in di pintu masuk hingga check-out.
- **Quiz**: Soal kuis yang mencakup kuis secara global atau khusus pada exhibit tertentu.
- **Question**: Data soal untuk kuis, menyimpan opsi jawaban, kunci jawaban yang benar, serta skor dasar per soal.
- **UserQuizAttempt**: Log upaya pengguna menyelesaikan suatu kuis.
- **UserQuizAnswer**: Detail dari masing-masing pilihan jawaban dari `UserQuizAttempt`.
- **Interaction**: Log interaksi pengunjung pada suatu exhibit dan media-media apa saja yang diklik.
- **InteractiveLabLog**: Aktivitas pengguna jika exhibit memiliki permainan lab interaktif.
- **RetentionSchedule**: Tabel antrean bagi Scheduler (cron) untuk mengirimkan notifikasi kuis retensi ke pengunjung.
- **EisScore**: Rekapitulasi akhir pengumpulan poin untuk dihitung sebagai Educational Impact Score.

## Skema Prisma Lengkap
```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─── ENUMS ───────────────────────────────────────────────

enum AgeCategory {
  CHILD   // Usia 5–11 tahun
  TEEN    // Usia 12–17 tahun
  ADULT   // Usia 18 tahun ke atas
}

enum QuizType {
  PRE_ZOO        // Kuis sebelum masuk kebun binatang
  POST_ZOO       // Kuis saat keluar kebun binatang
  RETENTION_1W   // Kuis retensi H+7
  RETENTION_1M   // Kuis retensi H+30
}

enum MediaType {
  AUDIO
  VIDEO
  IMAGE_INFOGRAPHIC
  INTERACTIVE_LAB
}

enum RetentionStatus {
  PENDING     // Belum waktunya dikirim
  SENT        // Sudah dikirim ke email
  COMPLETED   // Sudah dijawab pengunjung
  EXPIRED     // Melewati batas waktu tanpa dijawab
}

enum QuizScope {
  GLOBAL    // Kuis umum seluruh kebun binatang
  EXHIBIT   // Kuis spesifik per kandang
}

enum UserRole {
  VISITOR
  ADMIN
}

// ─── MODELS ──────────────────────────────────────────────

model User {
  id           Int          @id @default(autoincrement())
  name         String       @db.VarChar(100)
  email        String       @unique @db.VarChar(150)
  age          Int
  ageCategory  AgeCategory
  role         UserRole     @default(VISITOR)
  registeredAt DateTime     @default(now()) @map("registered_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")

  // OTP fields
  otpCode      String?      @map("otp_code")
  otpExpiresAt DateTime?    @map("otp_expires_at")

  // Relations
  visitSessions      VisitSession[]
  quizAttempts       UserQuizAttempt[]
  interactions       Interaction[]
  retentionSchedules RetentionSchedule[]
  eisScore           EisScore?

  @@map("users")
}

model Exhibit {
  id                Int      @id @default(autoincrement())
  name              String   @db.VarChar(100)
  zoneName          String   @map("zone_name") @db.VarChar(50)
  description       String?  @db.Text
  qrCodeIdentifier  String   @unique @map("qr_code_identifier") @db.VarChar(100)
  isActive          Boolean  @default(true) @map("is_active")
  createdAt         DateTime @default(now()) @map("created_at")

  // Relations
  media              ExhibitMedia[]
  learningContent    LearningPathContent[]
  quizzes            Quiz[]
  interactions       Interaction[]

  @@map("exhibits")
}

model ExhibitMedia {
  id          Int         @id @default(autoincrement())
  exhibitId   Int         @map("exhibit_id")
  ageCategory AgeCategory @map("age_category")
  mediaType   MediaType   @map("media_type")
  title       String      @db.VarChar(150)
  fileUrl     String      @map("file_url") @db.Text
  createdAt   DateTime    @default(now()) @map("created_at")

  exhibit Exhibit @relation(fields: [exhibitId], references: [id], onDelete: Cascade)

  @@map("exhibit_media")
}

model LearningPathContent {
  id           Int         @id @default(autoincrement())
  exhibitId    Int         @map("exhibit_id")
  ageCategory  AgeCategory @map("age_category")
  contentTitle String      @map("content_title") @db.VarChar(150)
  contentBody  String      @map("content_body") @db.Text
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  exhibit Exhibit @relation(fields: [exhibitId], references: [id], onDelete: Cascade)

  @@unique([exhibitId, ageCategory])
  @@map("learning_path_content")
}

model VisitSession {
  id          Int       @id @default(autoincrement())
  userId      Int       @map("user_id")
  visitDate   DateTime  @map("visit_date") @db.Date
  checkInAt   DateTime  @default(now()) @map("check_in_at")
  checkOutAt  DateTime? @map("check_out_at")
  isCompleted Boolean   @default(false) @map("is_completed")
  createdAt   DateTime  @default(now()) @map("created_at")

  user               User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  quizAttempts       UserQuizAttempt[]
  interactions       Interaction[]
  retentionSchedules RetentionSchedule[]
  eisScore           EisScore?

  @@map("visit_sessions")
}

model Quiz {
  id          Int         @id @default(autoincrement())
  exhibitId   Int?        @map("exhibit_id")
  scope       QuizScope   @default(GLOBAL)
  title       String      @db.VarChar(150)
  quizType    QuizType    @map("quiz_type")
  ageCategory AgeCategory @map("age_category")
  createdAt   DateTime    @default(now()) @map("created_at")

  exhibit      Exhibit?          @relation(fields: [exhibitId], references: [id], onDelete: SetNull)
  questions    Question[]
  quizAttempts UserQuizAttempt[]

  @@map("quizzes")
}

model Question {
  id            Int      @id @default(autoincrement())
  quizId        Int      @map("quiz_id")
  questionText  String   @map("question_text") @db.Text
  optionA       String   @map("option_a") @db.Text
  optionB       String   @map("option_b") @db.Text
  optionC       String   @map("option_c") @db.Text
  optionD       String   @map("option_d") @db.Text
  correctOption String   @map("correct_option") @db.Char(1)
  points        Int      @default(10)
  createdAt     DateTime @default(now()) @map("created_at")

  quiz    Quiz              @relation(fields: [quizId], references: [id], onDelete: Cascade)
  answers UserQuizAnswer[]

  @@map("questions")
}

model UserQuizAttempt {
  id             Int       @id @default(autoincrement())
  userId         Int       @map("user_id")
  sessionId      Int       @map("session_id")
  quizId         Int       @map("quiz_id")
  totalQuestions Int       @map("total_questions")
  correctAnswers Int       @default(0) @map("correct_answers")
  finalScore     Int       @default(0) @map("final_score")
  startedAt      DateTime  @default(now()) @map("started_at")
  completedAt    DateTime? @map("completed_at")

  user    User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  session VisitSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  quiz    Quiz         @relation(fields: [quizId], references: [id], onDelete: Cascade)
  answers UserQuizAnswer[]

  @@map("user_quiz_attempts")
}

model UserQuizAnswer {
  id            Int      @id @default(autoincrement())
  attemptId     Int      @map("attempt_id")
  questionId    Int      @map("question_id")
  chosenOption  String   @map("chosen_option") @db.Char(1)
  isCorrect     Boolean  @map("is_correct")
  answeredAt    DateTime @default(now()) @map("answered_at")

  attempt  UserQuizAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  question Question        @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@map("user_quiz_answers")
}

model Interaction {
  id                  Int       @id @default(autoincrement())
  sessionId           Int       @map("session_id")
  userId              Int       @map("user_id")
  exhibitId           Int       @map("exhibit_id")
  startTime           DateTime  @map("start_time")
  endTime             DateTime? @map("end_time")
  durationSeconds     Int?      @map("duration_seconds")
  clickedAudio        Boolean   @default(false) @map("clicked_audio")
  clickedVideo        Boolean   @default(false) @map("clicked_video")
  clickedVisual       Boolean   @default(false) @map("clicked_visual")
  clickedInteractive  Boolean   @default(false) @map("clicked_interactive")
  createdAt           DateTime  @default(now()) @map("created_at")

  session  VisitSession       @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user     User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  exhibit  Exhibit            @relation(fields: [exhibitId], references: [id], onDelete: Cascade)
  labLogs  InteractiveLabLog[]

  @@map("interactions")
}

model InteractiveLabLog {
  id            Int      @id @default(autoincrement())
  interactionId Int      @map("interaction_id")
  gameName      String   @map("game_name") @db.VarChar(100)
  actionTaken   String   @map("action_taken") @db.VarChar(100)
  scoreAchieved Int      @default(0) @map("score_achieved")
  loggedAt      DateTime @default(now()) @map("logged_at")

  interaction Interaction @relation(fields: [interactionId], references: [id], onDelete: Cascade)

  @@map("interactive_lab_logs")
}

model RetentionSchedule {
  id          Int             @id @default(autoincrement())
  userId      Int             @map("user_id")
  sessionId   Int             @map("session_id")
  quizType    QuizType        @map("quiz_type")
  scheduledAt DateTime        @map("scheduled_at")
  sentAt      DateTime?       @map("sent_at")
  status      RetentionStatus @default(PENDING)
  createdAt   DateTime        @default(now()) @map("created_at")

  user    User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  session VisitSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@unique([userId, sessionId, quizType])
  @@map("retention_schedules")
}

model EisScore {
  id                   Int       @id @default(autoincrement())
  userId               Int       @unique @map("user_id")
  sessionId            Int       @unique @map("session_id")
  preZooScore          Int       @default(0) @map("pre_zoo_score")
  postZooScore         Int       @default(0) @map("post_zoo_score")
  knowledgeGainScore   Int       @default(0) @map("knowledge_gain_score")
  totalDurationSeconds Int       @default(0) @map("total_duration_seconds")
  totalExhibitsVisited Int       @default(0) @map("total_exhibits_visited")
  favoriteMedia        MediaType? @map("favorite_media")
  engagementScore      Int       @default(0) @map("engagement_score")
  retention1wScore     Int?      @map("retention_1w_score")
  retention1mScore     Int?      @map("retention_1m_score")
  retentionScore       Int       @default(0) @map("retention_score")
  finalEisScore        Int       @default(0) @map("final_eis_score")
  calculatedAt         DateTime  @default(now()) @map("calculated_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")

  user    User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  session VisitSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@map("eis_scores")
}
```
