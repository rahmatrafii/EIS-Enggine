-- CreateEnum
CREATE TYPE "AgeCategory" AS ENUM ('CHILD', 'TEEN', 'ADULT');

-- CreateEnum
CREATE TYPE "QuizType" AS ENUM ('PRE_ZOO', 'POST_ZOO', 'RETENTION_1W', 'RETENTION_1M');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('AUDIO', 'VIDEO', 'IMAGE_INFOGRAPHIC', 'INTERACTIVE_LAB');

-- CreateEnum
CREATE TYPE "RetentionStatus" AS ENUM ('PENDING', 'SENT', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "QuizScope" AS ENUM ('GLOBAL', 'EXHIBIT');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('VISITOR', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "age" INTEGER NOT NULL,
    "ageCategory" "AgeCategory" NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VISITOR',
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "otp_code" TEXT,
    "otp_expires_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exhibits" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "zone_name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "qr_code_identifier" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exhibits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exhibit_media" (
    "id" SERIAL NOT NULL,
    "exhibit_id" INTEGER NOT NULL,
    "age_category" "AgeCategory" NOT NULL,
    "media_type" "MediaType" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "file_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exhibit_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_path_content" (
    "id" SERIAL NOT NULL,
    "exhibit_id" INTEGER NOT NULL,
    "age_category" "AgeCategory" NOT NULL,
    "content_title" VARCHAR(150) NOT NULL,
    "content_body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_path_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "visit_date" DATE NOT NULL,
    "check_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_out_at" TIMESTAMP(3),
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" SERIAL NOT NULL,
    "exhibit_id" INTEGER,
    "scope" "QuizScope" NOT NULL DEFAULT 'GLOBAL',
    "title" VARCHAR(150) NOT NULL,
    "quiz_type" "QuizType" NOT NULL,
    "age_category" "AgeCategory" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" SERIAL NOT NULL,
    "quiz_id" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "option_c" TEXT NOT NULL,
    "option_d" TEXT NOT NULL,
    "correct_option" CHAR(1) NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_quiz_attempts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "session_id" INTEGER NOT NULL,
    "quiz_id" INTEGER NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "final_score" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "user_quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_quiz_answers" (
    "id" SERIAL NOT NULL,
    "attempt_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "chosen_option" CHAR(1) NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_quiz_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "exhibit_id" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "clicked_audio" BOOLEAN NOT NULL DEFAULT false,
    "clicked_video" BOOLEAN NOT NULL DEFAULT false,
    "clicked_visual" BOOLEAN NOT NULL DEFAULT false,
    "clicked_interactive" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactive_lab_logs" (
    "id" SERIAL NOT NULL,
    "interaction_id" INTEGER NOT NULL,
    "game_name" VARCHAR(100) NOT NULL,
    "action_taken" VARCHAR(100) NOT NULL,
    "score_achieved" INTEGER NOT NULL DEFAULT 0,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactive_lab_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_schedules" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "session_id" INTEGER NOT NULL,
    "quiz_type" "QuizType" NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "status" "RetentionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retention_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eis_scores" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "session_id" INTEGER NOT NULL,
    "pre_zoo_score" INTEGER NOT NULL DEFAULT 0,
    "post_zoo_score" INTEGER NOT NULL DEFAULT 0,
    "knowledge_gain_score" INTEGER NOT NULL DEFAULT 0,
    "total_duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "total_exhibits_visited" INTEGER NOT NULL DEFAULT 0,
    "favorite_media" "MediaType",
    "engagement_score" INTEGER NOT NULL DEFAULT 0,
    "retention_1w_score" INTEGER,
    "retention_1m_score" INTEGER,
    "retention_score" INTEGER NOT NULL DEFAULT 0,
    "final_eis_score" INTEGER NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eis_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "exhibits_qr_code_identifier_key" ON "exhibits"("qr_code_identifier");

-- CreateIndex
CREATE UNIQUE INDEX "learning_path_content_exhibit_id_age_category_key" ON "learning_path_content"("exhibit_id", "age_category");

-- CreateIndex
CREATE UNIQUE INDEX "retention_schedules_user_id_session_id_quiz_type_key" ON "retention_schedules"("user_id", "session_id", "quiz_type");

-- CreateIndex
CREATE UNIQUE INDEX "eis_scores_user_id_key" ON "eis_scores"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "eis_scores_session_id_key" ON "eis_scores"("session_id");

-- AddForeignKey
ALTER TABLE "exhibit_media" ADD CONSTRAINT "exhibit_media_exhibit_id_fkey" FOREIGN KEY ("exhibit_id") REFERENCES "exhibits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_content" ADD CONSTRAINT "learning_path_content_exhibit_id_fkey" FOREIGN KEY ("exhibit_id") REFERENCES "exhibits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_sessions" ADD CONSTRAINT "visit_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_exhibit_id_fkey" FOREIGN KEY ("exhibit_id") REFERENCES "exhibits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_quiz_attempts" ADD CONSTRAINT "user_quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_quiz_attempts" ADD CONSTRAINT "user_quiz_attempts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "visit_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_quiz_attempts" ADD CONSTRAINT "user_quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_quiz_answers" ADD CONSTRAINT "user_quiz_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "user_quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_quiz_answers" ADD CONSTRAINT "user_quiz_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "visit_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_exhibit_id_fkey" FOREIGN KEY ("exhibit_id") REFERENCES "exhibits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactive_lab_logs" ADD CONSTRAINT "interactive_lab_logs_interaction_id_fkey" FOREIGN KEY ("interaction_id") REFERENCES "interactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_schedules" ADD CONSTRAINT "retention_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_schedules" ADD CONSTRAINT "retention_schedules_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "visit_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eis_scores" ADD CONSTRAINT "eis_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eis_scores" ADD CONSTRAINT "eis_scores_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "visit_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
