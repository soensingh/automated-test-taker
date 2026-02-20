"use client";

import dynamic from "next/dynamic";

const LoginFormNoSSR = dynamic(
  () => import("@/components/auth/login-form").then((module) => module.LoginForm),
  {
    ssr: false,
  },
);

export function LoginFormClientOnly() {
  return <LoginFormNoSSR />;
}
