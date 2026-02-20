import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !session.user.role) {
    redirect("/");
  }

  if (session.user.role === "superadmin") {
    redirect("/dashboard/superadmin");
  }

  if (session.user.role === "subadmin") {
    redirect("/dashboard/subadmin");
  }

  redirect("/dashboard/student");
}
