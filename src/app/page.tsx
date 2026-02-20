import { LoginFormClientOnly } from "@/components/auth/login-form-client-only";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <LoginFormClientOnly />
    </main>
  );
}
