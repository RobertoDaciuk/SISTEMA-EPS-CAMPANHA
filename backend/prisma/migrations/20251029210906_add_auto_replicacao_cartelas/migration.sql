-- CreateEnum
CREATE TYPE "ModoCartelas" AS ENUM ('MANUAL', 'AUTO_REPLICANTE');

-- CreateEnum
CREATE TYPE "TipoIncremento" AS ENUM ('SEM_INCREMENTO', 'MULTIPLICADOR');

-- AlterTable
ALTER TABLE "campanhas" ADD COLUMN     "fatorIncremento" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "limiteCartelas" INTEGER,
ADD COLUMN     "modoCartelas" "ModoCartelas" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "tipoIncremento" "TipoIncremento" NOT NULL DEFAULT 'SEM_INCREMENTO';
