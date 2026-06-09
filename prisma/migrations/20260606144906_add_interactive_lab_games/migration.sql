-- CreateEnum
CREATE TYPE "LabGameType" AS ENUM ('DRAG_DROP', 'MATCHING', 'PICTURE_CHOICE');

-- CreateTable
CREATE TABLE "interactive_lab_games" (
    "id" SERIAL NOT NULL,
    "exhibit_id" INTEGER NOT NULL,
    "age_category" "AgeCategory" NOT NULL,
    "game_type" "LabGameType" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "game_config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interactive_lab_games_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "interactive_lab_games" ADD CONSTRAINT "interactive_lab_games_exhibit_id_fkey" FOREIGN KEY ("exhibit_id") REFERENCES "exhibits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
