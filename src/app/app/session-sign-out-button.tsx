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
      className="inline-flex min-h-11 items-center rounded-md border border-zinc-700 px-3 py-2 text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900 hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
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
