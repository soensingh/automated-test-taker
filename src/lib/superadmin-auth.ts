import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";

export async function requireSuperAdminSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || session.user.role !== "superadmin") {
    return null;
  }

  return session;
}
