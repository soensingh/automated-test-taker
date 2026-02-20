"use client";

import { FormEvent, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiRoutes } from "@/lib/api-routes";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const isFormReady = useMemo(() => email.trim().length > 3, [email]);

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      setIsSendingOtp(true);
      const response = await fetch(apiRoutes.sendOtp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setMessage({ type: "error", text: payload.error ?? "Could not send OTP" });
        return;
      }
      setOtpSent(true);
      setMessage({ type: "success", text: "OTP sent! Check your inbox." });
    } catch {
      setMessage({ type: "error", text: "Could not send OTP" });
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleOtpLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      setIsLoggingIn(true);
      const result = await signIn("credentials", { email, otp, redirect: false });
      if (!result || result.error) {
        setMessage({ type: "error", text: "Invalid OTP. Please try again." });
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleGoogleSignIn() {
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    /* ── Full-screen root with dot-grid background only ── */
    <div className="relative min-h-screen w-full overflow-hidden bg-background flex items-center justify-center">

      {/* ── SVG Dot-Grid Pattern ── */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.5" className="fill-border" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* ── Radial vignette — fades dots at center so card area stays clean ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, var(--background) 100%)",
        }}
      />

      {/* ── Main content column ── */}
      <div className="relative z-10 w-full max-w-sm px-4">

        {/* ── Floating heading — outside the card ── */}
        <div className="mb-6 px-1">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Automated Test Taker — Administrator Portal
          </p>
        </div>

        {/* ── Card ── */}
        <div className="w-full rounded-2xl border border-border bg-background px-6 py-6">

          {/* Email + OTP Forms — PRIMARY, at the top */}
          <div className="space-y-4">

            {/* Email Field + Send OTP */}
            <form onSubmit={handleSendOtp} className="space-y-3">
              <div>
                <label
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  htmlFor="email"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none transition-colors duration-150"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!isFormReady || isSendingOtp}
                className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSendingOtp ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Sending...
                  </span>
                ) : otpSent ? "Resend OTP" : "Send OTP"}
              </button>
            </form>

            {/* OTP Field + Login */}
            <form onSubmit={handleOtpLogin} className="space-y-3">
              <div>
                <label
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  htmlFor="otp"
                >
                  One-Time Password
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-center text-sm tracking-[0.5em] text-foreground placeholder:text-muted-foreground placeholder:tracking-normal focus:border-foreground focus:outline-none transition-colors duration-150"
                  placeholder="••••••"
                  minLength={6}
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!isFormReady || otp.length !== 6 || isLoggingIn}
                className="w-full rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors duration-150 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoggingIn ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Signing in...
                  </span>
                ) : "Login with OTP"}
              </button>
            </form>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                message.type === "success"
                  ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
              }`}
            >
              <span className="mr-2 inline-flex items-center">
                {message.type === "success" ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </span>
              {message.text}
            </div>
          )}

          {/* ── Divider ── */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs uppercase tracking-widest text-muted-foreground">
                or
              </span>
            </div>
          </div>

          {/* Google Sign In — SECONDARY, at the bottom */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="group flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.2 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Footer note */}
          <p className="mt-5 text-center text-[11px] text-muted-foreground">
            Restricted access &mdash; authorized administrators only
          </p>
        </div>

        {/* Below-card footer */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Automated Test Taker
        </p>
      </div>
    </div>
  );
}
