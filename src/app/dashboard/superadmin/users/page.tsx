import { redirect } from "next/navigation";

export default async function SuperAdminUsersPage() {
  redirect("/dashboard/superadmin/students");
}
