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
  const [message, setMessage] = useState("");

  const isFormReady = useMemo(() => {
    return email.trim().length > 3;
  }, [email]);

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      setIsSendingOtp(true);
      const response = await fetch(apiRoutes.sendOtp, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setMessage(payload.error ?? "Could not send OTP");
        return;
      }

      setMessage("OTP sent successfully. Check your email.");
    } catch {
      setMessage("Could not send OTP");
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleOtpLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      setIsLoggingIn(true);
      const result = await signIn("credentials", {
        email,
        otp,
        redirect: false,
      });

      if (!result || result.error) {
        setMessage("Invalid OTP");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleGoogleSignIn() {
    await signIn("google", {
      callbackUrl: "/dashboard",
    });
  }

  return (
    <div className="ui-panel w-full max-w-md p-6 shadow-sm">
      <h1 className="mb-4 text-2xl font-semibold">Login</h1>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="ui-button-outline mb-6 w-full gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" className="h-5 w-5">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.2 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <form onSubmit={handleSendOtp} className="space-y-3">
        <label className="block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="ui-input w-full"
          placeholder="you@example.com"
          required
        />

        <button
          type="submit"
          disabled={!isFormReady || isSendingOtp}
          className="ui-button-primary w-full"
        >
          {isSendingOtp ? "Sending OTP..." : "Send OTP"}
        </button>
      </form>

      <form onSubmit={handleOtpLogin} className="mt-4 space-y-3">
        <label className="block text-sm font-medium" htmlFor="otp">
          OTP
        </label>
        <input
          id="otp"
          type="text"
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
          className="ui-input w-full"
          placeholder="6-digit code"
          minLength={6}
          maxLength={6}
          required
        />

        <button
          type="submit"
          disabled={!isFormReady || otp.length !== 6 || isLoggingIn}
          className="ui-button-primary w-full"
        >
          {isLoggingIn ? "Signing in..." : "Login with OTP"}
        </button>
      </form>

      {message ? <p className="ui-muted mt-4 text-sm">{message}</p> : null}
    </div>
  );
}
