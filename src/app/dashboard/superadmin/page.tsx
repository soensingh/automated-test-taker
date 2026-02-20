import { UserAuthController } from "@/modules/users/controllers/user-auth.controller";

export default async function SuperAdminDashboardPage() {
  const userAuthController = new UserAuthController();
  const users = await userAuthController.listAllUsers();
  const courses = await userAuthController.listCourses();

  const superadmins = users.filter((user) => user.role === "superadmin").length;
  const subadmins = users.filter((user) => user.role === "subadmin").length;
  const students = users.filter((user) => user.role === "student").length;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Exam Controller Dashboard</h1>
      <p className="ui-muted text-sm">
        Manage courses, create subadmins/students, and control permissions from the sidebar.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ui-panel p-4">
          <p className="ui-muted text-xs uppercase">Total Users</p>
          <p className="mt-1 text-2xl font-semibold">{users.length}</p>
        </div>
        <div className="ui-panel p-4">
          <p className="ui-muted text-xs uppercase">Superadmins</p>
          <p className="mt-1 text-2xl font-semibold">{superadmins}</p>
        </div>
        <div className="ui-panel p-4">
          <p className="ui-muted text-xs uppercase">Subadmins</p>
          <p className="mt-1 text-2xl font-semibold">{subadmins}</p>
        </div>
        <div className="ui-panel p-4">
          <p className="ui-muted text-xs uppercase">Students</p>
          <p className="mt-1 text-2xl font-semibold">{students}</p>
        </div>
      </div>

      <div className="ui-panel p-4">
        <p className="text-sm font-medium">Courses configured</p>
        <p className="mt-1 text-2xl font-semibold">{courses.length}</p>
      </div>
    </main>
  );
}
