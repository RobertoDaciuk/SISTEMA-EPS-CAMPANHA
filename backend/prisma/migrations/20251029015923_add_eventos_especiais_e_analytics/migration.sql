/*
  Warnings:

  - You are about to drop the `CartelaConcluida` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."CartelaConcluida" DROP CONSTRAINT "CartelaConcluida_campanhaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CartelaConcluida" DROP CONSTRAINT "CartelaConcluida_vendedorId_fkey";

-- AlterTable
ALTER TABLE "campanhas" ADD COLUMN     "criadoPorId" TEXT,
ADD COLUMN     "imagemCampanha" TEXT,
ADD COLUMN     "regras" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "envios_vendas" ADD COLUMN     "dadosValidacao" JSONB;

-- DropTable
DROP TABLE "public"."CartelaConcluida";

-- CreateTable
CREATE TABLE "eventos_especiais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "multiplicador" DECIMAL(5,2) NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "corDestaque" TEXT NOT NULL DEFAULT '#FF5733',
    "campanhaId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_especiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cartelas_concluidas" (
    "id" TEXT NOT NULL,
    "dataConclusao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numeroCartela" INTEGER NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "campanhaId" TEXT NOT NULL,

    CONSTRAINT "cartelas_concluidas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_especiais_campanhaId_idx" ON "eventos_especiais"("campanhaId");

-- CreateIndex
CREATE INDEX "eventos_especiais_dataInicio_dataFim_idx" ON "eventos_especiais"("dataInicio", "dataFim");

-- CreateIndex
CREATE INDEX "eventos_especiais_ativo_idx" ON "eventos_especiais"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "vendedor_campanha_cartela_unica" ON "cartelas_concluidas"("vendedorId", "campanhaId", "numeroCartela");

-- CreateIndex
CREATE INDEX "campanhas_criadoPorId_idx" ON "campanhas"("criadoPorId");

-- AddForeignKey
ALTER TABLE "campanhas" ADD CONSTRAINT "campanhas_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_especiais" ADD CONSTRAINT "eventos_especiais_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "campanhas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartelas_concluidas" ADD CONSTRAINT "cartelas_concluidas_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartelas_concluidas" ADD CONSTRAINT "cartelas_concluidas_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "campanhas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
