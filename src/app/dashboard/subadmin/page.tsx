import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { LogoutButton } from "@/components/auth/logout-button";
import { authOptions } from "@/lib/auth-options";

export default async function SubAdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/");
  }

  if (session.user.role !== "subadmin") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Subadmin Dashboard</h1>
      <p className="text-sm">Logged in as: {session.user.email}</p>
      <p className="text-sm">Role: {session.user.role}</p>
      <p className="text-sm">Scope: Exam Makers and Checkers</p>
      <p className="text-sm break-all">JWT: {session.accessToken}</p>
      <div className="pt-2">
        <LogoutButton />
      </div>
    </main>
  );
}
