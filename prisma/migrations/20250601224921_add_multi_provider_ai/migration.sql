/*
  Warnings:

  - The values [CUSTOM] on the enum `AgentType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `specialties` on the `ai_agents` table. All the data in the column will be lost.
  - You are about to drop the column `transferCriteria` on the `ai_agents` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `offices` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[cnpj]` on the table `offices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `aiModel` to the `ai_agents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider` to the `ai_agents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `officeId` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `officeId` to the `documents` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AIProvider" AS ENUM ('OPENAI', 'GOOGLE', 'ANTHROPIC');

-- CreateEnum
CREATE TYPE "AIModel" AS ENUM ('GPT_4_1_MINI', 'GPT_4O_MINI', 'GPT_4_5', 'GEMINI_2_5_PRO', 'CLAUDE_3_7', 'CLAUDE_4');

-- AlterEnum
BEGIN;
CREATE TYPE "AgentType_new" AS ENUM ('RECEPTIONIST', 'PREVIDENCIARIO', 'BPC_LOAS', 'TRABALHISTA');
ALTER TABLE "conversations" ALTER COLUMN "currentAgentType" TYPE "AgentType_new" USING ("currentAgentType"::text::"AgentType_new");
ALTER TABLE "ai_agents" ALTER COLUMN "type" TYPE "AgentType_new" USING ("type"::text::"AgentType_new");
ALTER TYPE "AgentType" RENAME TO "AgentType_old";
ALTER TYPE "AgentType_new" RENAME TO "AgentType";
DROP TYPE "AgentType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ai_agents" DROP CONSTRAINT "ai_agents_officeId_fkey";

-- AlterTable - Adicionar colunas com valores padrão primeiro
ALTER TABLE "ai_agents" DROP COLUMN "specialties",
DROP COLUMN "transferCriteria",
ADD COLUMN     "provider" "AIProvider",
ADD COLUMN     "aiModel" "AIModel",
ALTER COLUMN "model" DROP DEFAULT;

-- Atualizar registros existentes com valores padrão
UPDATE "ai_agents" SET "provider" = 'OPENAI', "aiModel" = 'GPT_4O_MINI';

-- Tornar as colunas obrigatórias agora que têm valores
ALTER TABLE "ai_agents" ALTER COLUMN "provider" SET NOT NULL;
ALTER TABLE "ai_agents" ALTER COLUMN "aiModel" SET NOT NULL;

-- AlterTable - Adicionar officeId para audit_logs 
ALTER TABLE "audit_logs" ADD COLUMN "officeId" TEXT;

-- Atualizar audit_logs com o primeiro escritório
UPDATE "audit_logs" SET "officeId" = (SELECT id FROM offices LIMIT 1);

-- Tornar coluna obrigatória
ALTER TABLE "audit_logs" ALTER COLUMN "officeId" SET NOT NULL;

-- AlterTable - Adicionar officeId para documents  
ALTER TABLE "documents" ADD COLUMN "officeId" TEXT;

-- Atualizar documents com o primeiro escritório
UPDATE "documents" SET "officeId" = (SELECT id FROM offices LIMIT 1);

-- Tornar coluna obrigatória
ALTER TABLE "documents" ALTER COLUMN "officeId" SET NOT NULL;

-- AlterTable
ALTER TABLE "offices" DROP COLUMN "description",
ADD COLUMN     "cnpj" TEXT;

-- CreateTable
CREATE TABLE "ai_provider_configs" (
    "id" TEXT NOT NULL,
    "provider" "AIProvider" NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "officeId" TEXT NOT NULL,

    CONSTRAINT "ai_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_provider_configs_officeId_provider_key" ON "ai_provider_configs"("officeId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "offices_cnpj_key" ON "offices"("cnpj");

-- AddForeignKey
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_provider_configs" ADD CONSTRAINT "ai_provider_configs_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
