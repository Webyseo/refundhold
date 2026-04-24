import { describe, expect, it } from "vitest";

import {
  getActionRequestControls,
  getAmountCurrency,
  type DashboardActionRequestState,
} from "./view-model";

describe("dashboard view model", () => {
  it("extracts amount and currency from request parameters", () => {
    expect(
      getAmountCurrency({
        amount: 100,
        currency: "EUR",
      }),
    ).toEqual({
      amount: "100",
      currency: "EUR",
    });
  });

  it("ignores malformed amount and currency parameters", () => {
    expect(
      getAmountCurrency({
        amount: "100",
        currency: 123,
      }),
    ).toEqual({
      amount: null,
      currency: null,
    });
  });

  it("shows approve and reject only for pending approval requests", () => {
    expect(
      getActionRequestControls({
        decision: "APPROVAL_REQUIRED",
        status: "APPROVAL_REQUIRED",
      }),
    ).toEqual({
      canApprove: true,
      canReject: true,
      canExecute: false,
    });
  });

  it("shows execute only for approved requests", () => {
    expect(
      getActionRequestControls({
        decision: "APPROVAL_REQUIRED",
        status: "APPROVED",
      }),
    ).toEqual({
      canApprove: false,
      canReject: false,
      canExecute: true,
    });
  });

  it("does not show actions for terminal requests", () => {
    const terminalStates = [
      {
        decision: "DENY",
        status: "DENIED",
      },
      {
        decision: "APPROVAL_REQUIRED",
        status: "REJECTED",
      },
      {
        decision: "APPROVAL_REQUIRED",
        status: "EXECUTED",
      },
    ] satisfies DashboardActionRequestState[];

    for (const state of terminalStates) {
      expect(getActionRequestControls(state)).toEqual({
        canApprove: false,
        canReject: false,
        canExecute: false,
      });
    }
  });
});
