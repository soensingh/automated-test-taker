import { redirect } from "next/navigation";

export default async function SuperAdminCreateUsersPage() {
  redirect("/dashboard/superadmin/subadmins");
}
