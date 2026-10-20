-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('PROPRIETARIO', 'PROFISSIONAL');

-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'SAIDA_VENDA', 'USO_INTERNO', 'AJUSTE');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'PROFISSIONAL',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "prazo_entrega_dias" INTEGER,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "marca" TEXT,
    "categoria" TEXT,
    "codigo_barras" TEXT,
    "preco_custo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "preco_venda" DECIMAL(10,2) NOT NULL,
    "estoque_atual" INTEGER NOT NULL DEFAULT 0,
    "estoque_minimo" INTEGER NOT NULL DEFAULT 0,
    "validade" DATE,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "fornecedor_id" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes" (
    "id" SERIAL NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "saldo_apos" INTEGER NOT NULL,
    "motivo" TEXT,
    "usuario_id" INTEGER NOT NULL,
    "venda_id" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendas" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "forma_pagamento" TEXT NOT NULL,
    "valor_total" DECIMAL(10,2) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_venda" (
    "id" SERIAL NOT NULL,
    "venda_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "itens_venda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_codigo_barras_key" ON "produtos"("codigo_barras");

-- CreateIndex
CREATE INDEX "movimentacoes_produto_id_criado_em_idx" ON "movimentacoes"("produto_id", "criado_em");

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_venda" ADD CONSTRAINT "itens_venda_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_venda" ADD CONSTRAINT "itens_venda_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
