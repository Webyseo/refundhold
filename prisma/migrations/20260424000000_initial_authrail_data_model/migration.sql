-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "AgentApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "ConnectorStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AuthRailDecision" AS ENUM ('ALLOW', 'DENY', 'APPROVAL_REQUIRED');

-- CreateEnum
CREATE TYPE "ActionRequestStatus" AS ENUM ('PROPOSED', 'ALLOWED', 'DENIED', 'APPROVAL_REQUIRED', 'APPROVED', 'REJECTED', 'EXECUTING', 'EXECUTED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ExecutionMode" AS ENUM ('DIRECT', 'GRANT');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'GRANT_ISSUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('ACTION_PROPOSED', 'POLICY_EVALUATED', 'APPROVAL_REQUESTED', 'APPROVAL_APPROVED', 'APPROVAL_REJECTED', 'EXECUTION_GRANT_ISSUED', 'EXECUTION_STARTED', 'EXECUTION_SUCCEEDED', 'EXECUTION_FAILED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_api_keys" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "status" "AgentApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connectors" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "ConnectorStatus" NOT NULL DEFAULT 'ACTIVE',
    "configuration" JSONB,
    "encryptedCredentialsPlaceholder" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectorId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "decision" "AuthRailDecision" NOT NULL,
    "rules" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "connectorId" TEXT,
    "policyId" TEXT,
    "operation" TEXT NOT NULL,
    "resource" JSONB NOT NULL,
    "parameters" JSONB NOT NULL,
    "context" JSONB NOT NULL,
    "requestPayload" JSONB,
    "decision" "AuthRailDecision",
    "status" "ActionRequestStatus" NOT NULL DEFAULT 'PROPOSED',
    "decisionReason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actionRequestId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "executions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actionRequestId" TEXT NOT NULL,
    "connectorId" TEXT,
    "mode" "ExecutionMode" NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "grantTokenHash" TEXT,
    "grantExpiresAt" TIMESTAMP(3),
    "responsePayload" JSONB,
    "errorMetadata" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actionRequestId" TEXT,
    "approvalId" TEXT,
    "executionId" TEXT,
    "agentId" TEXT,
    "userId" TEXT,
    "actorType" "AuditActorType" NOT NULL,
    "type" "AuditEventType" NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "users_organizationId_status_idx" ON "users"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "users_organizationId_email_key" ON "users"("organizationId", "email");

-- CreateIndex
CREATE INDEX "agents_organizationId_status_idx" ON "agents"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "agents_organizationId_name_key" ON "agents"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "agent_api_keys_keyHash_key" ON "agent_api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "agent_api_keys_organizationId_agentId_idx" ON "agent_api_keys"("organizationId", "agentId");

-- CreateIndex
CREATE INDEX "agent_api_keys_organizationId_status_idx" ON "agent_api_keys"("organizationId", "status");

-- CreateIndex
CREATE INDEX "connectors_organizationId_type_idx" ON "connectors"("organizationId", "type");

-- CreateIndex
CREATE INDEX "connectors_organizationId_status_idx" ON "connectors"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "connectors_organizationId_name_key" ON "connectors"("organizationId", "name");

-- CreateIndex
CREATE INDEX "policies_organizationId_status_idx" ON "policies"("organizationId", "status");

-- CreateIndex
CREATE INDEX "policies_organizationId_connectorId_idx" ON "policies"("organizationId", "connectorId");

-- CreateIndex
CREATE UNIQUE INDEX "policies_organizationId_name_key" ON "policies"("organizationId", "name");

-- CreateIndex
CREATE INDEX "action_requests_organizationId_status_idx" ON "action_requests"("organizationId", "status");

-- CreateIndex
CREATE INDEX "action_requests_organizationId_decision_idx" ON "action_requests"("organizationId", "decision");

-- CreateIndex
CREATE INDEX "action_requests_organizationId_agentId_idx" ON "action_requests"("organizationId", "agentId");

-- CreateIndex
CREATE INDEX "action_requests_organizationId_connectorId_idx" ON "action_requests"("organizationId", "connectorId");

-- CreateIndex
CREATE INDEX "action_requests_organizationId_policyId_idx" ON "action_requests"("organizationId", "policyId");

-- CreateIndex
CREATE INDEX "approvals_organizationId_status_idx" ON "approvals"("organizationId", "status");

-- CreateIndex
CREATE INDEX "approvals_organizationId_actionRequestId_idx" ON "approvals"("organizationId", "actionRequestId");

-- CreateIndex
CREATE INDEX "approvals_organizationId_reviewerId_idx" ON "approvals"("organizationId", "reviewerId");

-- CreateIndex
CREATE INDEX "executions_organizationId_status_idx" ON "executions"("organizationId", "status");

-- CreateIndex
CREATE INDEX "executions_organizationId_actionRequestId_idx" ON "executions"("organizationId", "actionRequestId");

-- CreateIndex
CREATE INDEX "executions_organizationId_connectorId_idx" ON "executions"("organizationId", "connectorId");

-- CreateIndex
CREATE INDEX "audit_events_organizationId_type_idx" ON "audit_events"("organizationId", "type");

-- CreateIndex
CREATE INDEX "audit_events_organizationId_actionRequestId_idx" ON "audit_events"("organizationId", "actionRequestId");

-- CreateIndex
CREATE INDEX "audit_events_organizationId_approvalId_idx" ON "audit_events"("organizationId", "approvalId");

-- CreateIndex
CREATE INDEX "audit_events_organizationId_executionId_idx" ON "audit_events"("organizationId", "executionId");

-- CreateIndex
CREATE INDEX "audit_events_organizationId_agentId_idx" ON "audit_events"("organizationId", "agentId");

-- CreateIndex
CREATE INDEX "audit_events_organizationId_userId_idx" ON "audit_events"("organizationId", "userId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_api_keys" ADD CONSTRAINT "agent_api_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_api_keys" ADD CONSTRAINT "agent_api_keys_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_requests" ADD CONSTRAINT "action_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_requests" ADD CONSTRAINT "action_requests_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_requests" ADD CONSTRAINT "action_requests_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_requests" ADD CONSTRAINT "action_requests_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_actionRequestId_fkey" FOREIGN KEY ("actionRequestId") REFERENCES "action_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executions" ADD CONSTRAINT "executions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executions" ADD CONSTRAINT "executions_actionRequestId_fkey" FOREIGN KEY ("actionRequestId") REFERENCES "action_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executions" ADD CONSTRAINT "executions_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actionRequestId_fkey" FOREIGN KEY ("actionRequestId") REFERENCES "action_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "approvals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
