-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('ADMIN', 'GERENTE', 'VENDEDOR');

-- CreateEnum
CREATE TYPE "StatusUsuario" AS ENUM ('PENDENTE', 'ATIVO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "StatusEnvioVenda" AS ENUM ('EM_ANALISE', 'VALIDADO', 'REJEITADO', 'CONFLITO_MANUAL');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'PAGO');

-- CreateEnum
CREATE TYPE "NivelVendedor" AS ENUM ('BRONZE', 'PRATA', 'OURO', 'DIAMANTE');

-- CreateEnum
CREATE TYPE "TipoUnidade" AS ENUM ('PAR', 'UNIDADE');

-- CreateEnum
CREATE TYPE "CampoVerificacao" AS ENUM ('NOME_PRODUTO', 'CODIGO_PRODUTO', 'VALOR_VENDA', 'CATEGORIA_PRODUTO');

-- CreateEnum
CREATE TYPE "OperadorCondicao" AS ENUM ('CONTEM', 'NAO_CONTEM', 'IGUAL_A', 'NAO_IGUAL_A', 'MAIOR_QUE', 'MENOR_QUE');

-- CreateEnum
CREATE TYPE "StatusResgate" AS ENUM ('SOLICITADO', 'ENVIADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "opticas" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opticas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" TEXT,
    "nome" TEXT NOT NULL,
    "whatsapp" TEXT,
    "senhaHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "papel" "PapelUsuario" NOT NULL,
    "status" "StatusUsuario" NOT NULL DEFAULT 'PENDENTE',
    "saldoMoedinhas" INTEGER NOT NULL DEFAULT 0,
    "rankingMoedinhas" INTEGER NOT NULL DEFAULT 0,
    "nivel" "NivelVendedor" NOT NULL DEFAULT 'BRONZE',
    "tokenResetarSenha" TEXT,
    "tokenResetarSenhaExpira" TIMESTAMP(3),
    "mapeamentoPlanilhaSalvo" JSONB,
    "opticaId" TEXT,
    "gerenteId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campanhas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "moedinhasPorCartela" INTEGER NOT NULL,
    "pontosReaisPorCartela" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVA',
    "percentualGerente" DECIMAL(5,4) NOT NULL DEFAULT 0.0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campanhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regras_cartelas" (
    "id" TEXT NOT NULL,
    "numeroCartela" INTEGER NOT NULL,
    "descricao" TEXT,
    "campanhaId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regras_cartelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisitos_cartelas" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "tipoUnidade" "TipoUnidade" NOT NULL DEFAULT 'UNIDADE',
    "ordem" INTEGER NOT NULL,
    "regraCartelaId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requisitos_cartelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condicoes_requisitos" (
    "id" TEXT NOT NULL,
    "campo" "CampoVerificacao" NOT NULL,
    "operador" "OperadorCondicao" NOT NULL,
    "valor" TEXT NOT NULL,
    "requisitoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "condicoes_requisitos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "envios_vendas" (
    "id" TEXT NOT NULL,
    "numeroPedido" TEXT NOT NULL,
    "status" "StatusEnvioVenda" NOT NULL DEFAULT 'EM_ANALISE',
    "dataEnvio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivoRejeicao" TEXT,
    "infoConflito" TEXT,
    "numeroCartelaAtendida" INTEGER,
    "dataValidacao" TIMESTAMP(3),
    "vendedorId" TEXT NOT NULL,
    "campanhaId" TEXT NOT NULL,
    "requisitoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "envios_vendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "premios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "imageUrl" TEXT,
    "custoMoedinhas" INTEGER NOT NULL,
    "estoque" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "premios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resgates_premios" (
    "id" TEXT NOT NULL,
    "dataSolicitacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatusResgate" NOT NULL DEFAULT 'SOLICITADO',
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,
    "motivoCancelamento" TEXT,
    "vendedorId" TEXT NOT NULL,
    "premioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resgates_premios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatorios_financeiros" (
    "id" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "tipo" TEXT NOT NULL,
    "dataGerado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPagamento" TIMESTAMP(3),
    "observacoes" TEXT,
    "usuarioId" TEXT NOT NULL,
    "campanhaId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relatorios_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "linkUrl" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes_globais" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_globais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartelaConcluida" (
    "id" TEXT NOT NULL,
    "dataConclusao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numeroCartela" INTEGER NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "campanhaId" TEXT NOT NULL,

    CONSTRAINT "CartelaConcluida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "opticas_cnpj_key" ON "opticas"("cnpj");

-- CreateIndex
CREATE INDEX "opticas_cnpj_idx" ON "opticas"("cnpj");

-- CreateIndex
CREATE INDEX "opticas_ativa_idx" ON "opticas"("ativa");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_cpf_key" ON "usuarios"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tokenResetarSenha_key" ON "usuarios"("tokenResetarSenha");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_cpf_idx" ON "usuarios"("cpf");

-- CreateIndex
CREATE INDEX "usuarios_gerenteId_idx" ON "usuarios"("gerenteId");

-- CreateIndex
CREATE INDEX "usuarios_papel_idx" ON "usuarios"("papel");

-- CreateIndex
CREATE INDEX "usuarios_status_idx" ON "usuarios"("status");

-- CreateIndex
CREATE INDEX "usuarios_opticaId_idx" ON "usuarios"("opticaId");

-- CreateIndex
CREATE INDEX "usuarios_tokenResetarSenha_idx" ON "usuarios"("tokenResetarSenha");

-- CreateIndex
CREATE INDEX "campanhas_status_idx" ON "campanhas"("status");

-- CreateIndex
CREATE INDEX "campanhas_dataInicio_dataFim_idx" ON "campanhas"("dataInicio", "dataFim");

-- CreateIndex
CREATE INDEX "regras_cartelas_campanhaId_idx" ON "regras_cartelas"("campanhaId");

-- CreateIndex
CREATE UNIQUE INDEX "regras_cartelas_campanhaId_numeroCartela_key" ON "regras_cartelas"("campanhaId", "numeroCartela");

-- CreateIndex
CREATE INDEX "requisitos_cartelas_regraCartelaId_idx" ON "requisitos_cartelas"("regraCartelaId");

-- CreateIndex
CREATE INDEX "requisitos_cartelas_ordem_idx" ON "requisitos_cartelas"("ordem");

-- CreateIndex
CREATE INDEX "condicoes_requisitos_requisitoId_idx" ON "condicoes_requisitos"("requisitoId");

-- CreateIndex
CREATE INDEX "envios_vendas_vendedorId_idx" ON "envios_vendas"("vendedorId");

-- CreateIndex
CREATE INDEX "envios_vendas_campanhaId_idx" ON "envios_vendas"("campanhaId");

-- CreateIndex
CREATE INDEX "envios_vendas_status_idx" ON "envios_vendas"("status");

-- CreateIndex
CREATE INDEX "envios_vendas_numeroPedido_idx" ON "envios_vendas"("numeroPedido");

-- CreateIndex
CREATE INDEX "envios_vendas_requisitoId_idx" ON "envios_vendas"("requisitoId");

-- CreateIndex
CREATE INDEX "premios_ativo_idx" ON "premios"("ativo");

-- CreateIndex
CREATE INDEX "resgates_premios_vendedorId_idx" ON "resgates_premios"("vendedorId");

-- CreateIndex
CREATE INDEX "resgates_premios_premioId_idx" ON "resgates_premios"("premioId");

-- CreateIndex
CREATE INDEX "resgates_premios_status_idx" ON "resgates_premios"("status");

-- CreateIndex
CREATE INDEX "relatorios_financeiros_usuarioId_idx" ON "relatorios_financeiros"("usuarioId");

-- CreateIndex
CREATE INDEX "relatorios_financeiros_campanhaId_idx" ON "relatorios_financeiros"("campanhaId");

-- CreateIndex
CREATE INDEX "relatorios_financeiros_status_idx" ON "relatorios_financeiros"("status");

-- CreateIndex
CREATE INDEX "relatorios_financeiros_tipo_idx" ON "relatorios_financeiros"("tipo");

-- CreateIndex
CREATE INDEX "notificacoes_usuarioId_idx" ON "notificacoes"("usuarioId");

-- CreateIndex
CREATE INDEX "notificacoes_lida_idx" ON "notificacoes"("lida");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_globais_chave_key" ON "configuracoes_globais"("chave");

-- CreateIndex
CREATE INDEX "configuracoes_globais_chave_idx" ON "configuracoes_globais"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "vendedor_campanha_cartela_unica" ON "CartelaConcluida"("vendedorId", "campanhaId", "numeroCartela");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_opticaId_fkey" FOREIGN KEY ("opticaId") REFERENCES "opticas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_gerenteId_fkey" FOREIGN KEY ("gerenteId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regras_cartelas" ADD CONSTRAINT "regras_cartelas_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "campanhas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitos_cartelas" ADD CONSTRAINT "requisitos_cartelas_regraCartelaId_fkey" FOREIGN KEY ("regraCartelaId") REFERENCES "regras_cartelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condicoes_requisitos" ADD CONSTRAINT "condicoes_requisitos_requisitoId_fkey" FOREIGN KEY ("requisitoId") REFERENCES "requisitos_cartelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envios_vendas" ADD CONSTRAINT "envios_vendas_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envios_vendas" ADD CONSTRAINT "envios_vendas_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "campanhas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envios_vendas" ADD CONSTRAINT "envios_vendas_requisitoId_fkey" FOREIGN KEY ("requisitoId") REFERENCES "requisitos_cartelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resgates_premios" ADD CONSTRAINT "resgates_premios_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resgates_premios" ADD CONSTRAINT "resgates_premios_premioId_fkey" FOREIGN KEY ("premioId") REFERENCES "premios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios_financeiros" ADD CONSTRAINT "relatorios_financeiros_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios_financeiros" ADD CONSTRAINT "relatorios_financeiros_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "campanhas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartelaConcluida" ADD CONSTRAINT "CartelaConcluida_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartelaConcluida" ADD CONSTRAINT "CartelaConcluida_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "campanhas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
