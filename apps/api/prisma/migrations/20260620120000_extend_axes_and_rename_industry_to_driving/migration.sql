-- AlterEnum: add the four cognitive axis types
ALTER TYPE "AxisType" ADD VALUE 'ATTENTION';
ALTER TYPE "AxisType" ADD VALUE 'NUMERICAL';
ALTER TYPE "AxisType" ADD VALUE 'VERBAL';
ALTER TYPE "AxisType" ADD VALUE 'SPATIAL';

-- AlterEnum: rename the industry sector to driving (non-destructive, keeps existing rows)
ALTER TYPE "Sector" RENAME VALUE 'INDUSTRY' TO 'DRIVING';
