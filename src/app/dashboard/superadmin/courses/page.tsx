import { CoursesManagement } from "@/components/superadmin/courses-management";
import { UserAuthController } from "@/modules/users/controllers/user-auth.controller";

export default async function SuperAdminCoursesPage() {
  const userAuthController = new UserAuthController();
  const courses = await userAuthController.listCourses();
  const users = await userAuthController.listAllUsers();

  const subadmins = users.filter((user) => user.role === "subadmin");
  const students = users.filter((user) => user.role === "student");

  const maxSerial = courses.reduce((maxValue, course) => {
    const match = course.code.match(/\d+/);

    if (!match) {
      return maxValue;
    }

    const parsed = Number.parseInt(match[0], 10);
    return Number.isFinite(parsed) ? Math.max(maxValue, parsed) : maxValue;
  }, 0);

  const initialNextCode = String(maxSerial + 1).padStart(3, "0");

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Courses</h1>
      <CoursesManagement
        initialCourses={courses}
        initialSubadmins={subadmins}
        initialStudents={students}
        initialNextCode={initialNextCode}
      />
    </main>
  );
}
