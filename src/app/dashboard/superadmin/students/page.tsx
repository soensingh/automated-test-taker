import { StudentsManagement } from "@/components/superadmin/students-management";
import { UserAuthController } from "@/modules/users/controllers/user-auth.controller";

export default async function SuperAdminStudentsPage() {
  const userAuthController = new UserAuthController();
  const users = await userAuthController.listAllUsers();

  const students = users
    .filter((user) => user.role === "student")
    .map((user) => ({
      email: user.email,
      name: user.name,
      role: "student" as const,
      isActive: user.isActive,
      permissions: user.permissions,
    }));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Students</h1>
      <p className="ui-muted text-sm">Create students and manage their sign-in and exam permissions.</p>
      <StudentsManagement students={students} />
    </main>
  );
}
