"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { handleApprovalDecision } from "@/lib/approvals/handler";
import { createPrismaApprovalDecisionPersistence } from "@/lib/approvals/prisma-persistence";
import { resolveHumanActionActor } from "@/lib/auth/action-actor";
import { getPrismaClient } from "@/lib/db/prisma";
import { DEMO_ACCESS_COOKIE_NAME } from "@/lib/demo-access";
import { handleDryRunExecution } from "@/lib/executions/handler";
import { createPrismaDryRunExecutionPersistence } from "@/lib/executions/prisma-persistence";

const defaultReviewerEmail = "demo.reviewer@refundhold.com";

export async function approveActionRequestFromDashboard(formData: FormData) {
  await reviewActionRequestFromDashboard("approve", formData);
}

export async function rejectActionRequestFromDashboard(formData: FormData) {
  await reviewActionRequestFromDashboard("reject", formData);
}

export async function executeActionRequestFromDashboard(formData: FormData) {
  const actionRequestId = getActionRequestId(formData);
  const actorResult = await resolveHumanActionActor({
    requiredPermission: "executeRefunds",
    demoReviewerEmail: getDemoReviewerEmail(),
  });

  if (!actorResult.ok) {
    redirectWithResult({
      actionRequestId,
      successMessage: "Dry-run execution completed.",
      response: actorResult.response,
    });
  }

  const prisma = await getPrismaClient();
  const response = await handleDryRunExecution({
    actionRequestId,
    body: {
      metadata: {
        source: "dashboard",
      },
    },
    actor: actorResult.actor,
    persistence: createPrismaDryRunExecutionPersistence(prisma),
  });

  revalidateDashboardPaths(actionRequestId);
  redirectWithResult({
    actionRequestId,
    successMessage: "Dry-run execution completed.",
    response,
  });
}

export async function clearDemoAccessFromDashboard() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: DEMO_ACCESS_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/app",
    maxAge: 0,
  });

  redirect("/demo-access?next=%2Fapp");
}

async function reviewActionRequestFromDashboard(
  action: "approve" | "reject",
  formData: FormData,
) {
  const actionRequestId = getActionRequestId(formData);
  const comment = getOptionalString(formData, "comment");
  const actorResult = await resolveHumanActionActor({
    requiredPermission: "reviewActionRequests",
    demoReviewerEmail: getDemoReviewerEmail(),
  });

  if (!actorResult.ok) {
    redirectWithResult({
      actionRequestId,
      successMessage:
        action === "approve"
          ? "Refund request approved."
          : "Refund request rejected.",
      response: actorResult.response,
    });
  }

  const prisma = await getPrismaClient();
  const response = await handleApprovalDecision({
    action,
    actionRequestId,
    body: {
      ...(comment ? { comment } : {}),
    },
    actor: actorResult.actor,
    reviewerEmailHeader: getDemoReviewerEmail(),
    persistence: createPrismaApprovalDecisionPersistence(prisma),
  });

  revalidateDashboardPaths(actionRequestId);
  redirectWithResult({
    actionRequestId,
    successMessage:
      action === "approve"
        ? "Refund request approved."
        : "Refund request rejected.",
    response,
  });
}

function getActionRequestId(formData: FormData): string {
  const value = formData.get("actionRequestId");

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("actionRequestId is required.");
  }

  return value;
}

function getOptionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getDemoReviewerEmail(): string {
  const reviewerEmail = process.env["AUTHRAIL_DEMO_REVIEWER_EMAIL"]?.trim();

  return reviewerEmail && reviewerEmail.length > 0
    ? reviewerEmail
    : defaultReviewerEmail;
}

function revalidateDashboardPaths(actionRequestId: string) {
  revalidatePath("/app/action-requests");
  revalidatePath(`/app/action-requests/${actionRequestId}`);
}

function redirectWithResult({
  actionRequestId,
  successMessage,
  response,
}: {
  actionRequestId: string;
  successMessage: string;
  response: {
    status: number;
    body: Record<string, unknown>;
  };
}): never {
  const searchParams = new URLSearchParams();

  if (response.status >= 200 && response.status < 300) {
    searchParams.set("success", successMessage);
  } else {
    searchParams.set(
      "error",
      typeof response.body["message"] === "string"
        ? response.body["message"]
        : "Action could not be completed.",
    );
  }

  redirect(`/app/action-requests/${actionRequestId}?${searchParams}`);
}
