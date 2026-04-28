"use client";

import { useState, type FormEvent } from "react";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        callbackURL: nextPath,
        rememberMe: true,
      }),
    }).catch(() => null);

    if (!response?.ok) {
      setIsSubmitting(false);
      setError("Invalid email or password.");
      return;
    }

    window.location.assign(nextPath);
  }

  return (
    <form onSubmit={submitLogin} className="mt-6 space-y-4">
      <p className="text-sm leading-6 text-zinc-600">
        Sign in with a provisioned RefundHold reviewer account.
      </p>
      <div>
        <label htmlFor="email" className="text-sm font-semibold text-zinc-950">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          required
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="text-sm font-semibold text-zinc-950"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          required
        />
      </div>
      <input type="hidden" name="next" value={nextPath} />

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="w-full rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-500"
        disabled={isSubmitting}
      >
        Sign in
      </button>
    </form>
  );
}
