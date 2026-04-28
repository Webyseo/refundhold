-- CreateEnum
CREATE TYPE "StripeMode" AS ENUM ('TEST', 'LIVE');

-- CreateEnum
CREATE TYPE "StripeWebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateTable
CREATE TABLE "stripe_payment_objects" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "mode" "StripeMode" NOT NULL DEFAULT 'TEST',
    "paymentIntentId" TEXT,
    "chargeId" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "amountRefundedMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL DEFAULT false,
    "safeSnapshot" JSONB NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_payment_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_refunds" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "actionRequestId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "mode" "StripeMode" NOT NULL DEFAULT 'TEST',
    "stripeRefundId" TEXT,
    "paymentIntentId" TEXT,
    "chargeId" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "reason" TEXT,
    "stripeStatus" TEXT,
    "idempotencyKeyHash" TEXT NOT NULL,
    "stripeRequestId" TEXT,
    "safeResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "mode" "StripeMode" NOT NULL,
    "livemode" BOOLEAN NOT NULL,
    "type" TEXT NOT NULL,
    "objectId" TEXT,
    "payloadHash" TEXT NOT NULL,
    "safePayload" JSONB,
    "status" "StripeWebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stripe_payment_objects_organizationId_connectorId_idx" ON "stripe_payment_objects"("organizationId", "connectorId");

-- CreateIndex
CREATE INDEX "stripe_payment_objects_paymentIntentId_idx" ON "stripe_payment_objects"("paymentIntentId");

-- CreateIndex
CREATE INDEX "stripe_payment_objects_chargeId_idx" ON "stripe_payment_objects"("chargeId");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_refunds_actionRequestId_key" ON "stripe_refunds"("actionRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_refunds_executionId_key" ON "stripe_refunds"("executionId");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_refunds_stripeRefundId_key" ON "stripe_refunds"("stripeRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_refunds_idempotencyKeyHash_key" ON "stripe_refunds"("idempotencyKeyHash");

-- CreateIndex
CREATE INDEX "stripe_refunds_organizationId_connectorId_idx" ON "stripe_refunds"("organizationId", "connectorId");

-- CreateIndex
CREATE INDEX "stripe_refunds_organizationId_stripeStatus_idx" ON "stripe_refunds"("organizationId", "stripeStatus");

-- CreateIndex
CREATE INDEX "stripe_refunds_paymentIntentId_idx" ON "stripe_refunds"("paymentIntentId");

-- CreateIndex
CREATE INDEX "stripe_refunds_chargeId_idx" ON "stripe_refunds"("chargeId");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_webhook_events_stripeEventId_key" ON "stripe_webhook_events"("stripeEventId");

-- CreateIndex
CREATE INDEX "stripe_webhook_events_type_receivedAt_idx" ON "stripe_webhook_events"("type", "receivedAt");

-- CreateIndex
CREATE INDEX "stripe_webhook_events_objectId_idx" ON "stripe_webhook_events"("objectId");

-- CreateIndex
CREATE INDEX "stripe_webhook_events_status_idx" ON "stripe_webhook_events"("status");

-- AddForeignKey
ALTER TABLE "stripe_payment_objects" ADD CONSTRAINT "stripe_payment_objects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_payment_objects" ADD CONSTRAINT "stripe_payment_objects_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_refunds" ADD CONSTRAINT "stripe_refunds_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_refunds" ADD CONSTRAINT "stripe_refunds_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_refunds" ADD CONSTRAINT "stripe_refunds_actionRequestId_fkey" FOREIGN KEY ("actionRequestId") REFERENCES "action_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_refunds" ADD CONSTRAINT "stripe_refunds_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
