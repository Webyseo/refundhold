"use client";

import { useState } from "react";

export function SessionSignOutButton({ redirectTo }: { redirectTo: string }) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);

    await fetch("/api/auth/sign-out", getSessionSignOutRequestInit()).catch(
      () => null,
    );

    window.location.assign(redirectTo);
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={isSigningOut}
      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSigningOut ? "Signing out..." : "Sign out"}
    </button>
  );
}

export function getSessionSignOutRequestInit(): RequestInit {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: "{}",
  };
}
