import { describe, expect, it } from "vitest";

import { getSessionSignOutRequestInit } from "./session-sign-out-button";

describe("SessionSignOutButton", () => {
  it("posts a JSON sign-out request accepted by Better Auth", () => {
    expect(getSessionSignOutRequestInit()).toEqual({
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{}",
    });
  });
});
