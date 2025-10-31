-- AlterTable
ALTER TABLE "campanhas" ADD COLUMN     "paraTodasOticas" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "opticas" ADD COLUMN     "ehMatriz" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "matrizId" TEXT;

-- CreateTable
CREATE TABLE "_CampanhasOticas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CampanhasOticas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CampanhasOticas_B_index" ON "_CampanhasOticas"("B");

-- CreateIndex
CREATE INDEX "opticas_ehMatriz_idx" ON "opticas"("ehMatriz");

-- CreateIndex
CREATE INDEX "opticas_matrizId_idx" ON "opticas"("matrizId");

-- AddForeignKey
ALTER TABLE "opticas" ADD CONSTRAINT "opticas_matrizId_fkey" FOREIGN KEY ("matrizId") REFERENCES "opticas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampanhasOticas" ADD CONSTRAINT "_CampanhasOticas_A_fkey" FOREIGN KEY ("A") REFERENCES "campanhas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampanhasOticas" ADD CONSTRAINT "_CampanhasOticas_B_fkey" FOREIGN KEY ("B") REFERENCES "opticas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
