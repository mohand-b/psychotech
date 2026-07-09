-- CreateEnum
CREATE TYPE "ControlModality" AS ENUM ('KEYBOARD', 'PHONE_GAMEPAD', 'TOUCH_JOYSTICKS');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "controlModality" "ControlModality";
