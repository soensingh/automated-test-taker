import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { SuperAdminSidebar } from "@/components/superadmin/sidebar";
import { authOptions } from "@/lib/auth-options";

export default async function SuperAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/");
  }

  if (session.user.role !== "superadmin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-slate-50 dark:bg-slate-950">
      <SuperAdminSidebar email={session.user.email} image={session.user.image} />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
