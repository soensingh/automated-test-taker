import { SubadminsManagement } from "@/components/superadmin/subadmins-management";
import { UserAuthController } from "@/modules/users/controllers/user-auth.controller";

export default async function SuperAdminSubadminsPage() {
  const userAuthController = new UserAuthController();
  const users = await userAuthController.listAllUsers();
  const courses = await userAuthController.listCourses();

  const subadmins = users
    .filter((user) => user.role === "subadmin")
    .map((user) => ({
      email: user.email,
      name: user.name,
      role: "subadmin" as const,
      isActive: user.isActive,
      permissions: user.permissions,
      courseCodes: user.courseCodes,
    }));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Subadmins</h1>
      <p className="ui-muted text-sm">
        Create subadmins, assign courses, and manage access permissions.
      </p>
      <SubadminsManagement
        subadmins={subadmins}
        courses={courses.map((course) => ({ code: course.code, name: course.name }))}
      />
    </main>
  );
}
