import { ExamsManagement } from "@/components/superadmin/exams-management";
import { getDb } from "@/lib/mongodb";
import { UserAuthController } from "@/modules/users/controllers/user-auth.controller";

type ExamView = {
  id: string;
  courseCodes: string[];
  examDate: string;
  durationMinutes: number;
  sets: Array<{
    name: string;
    description: string;
  }>;
  studentSetAssignments: Array<{
    studentEmail: string;
    setName: string;
  }>;
  status: "scheduled" | "started" | "ended" | "terminated";
  startedAt: string | null;
  endedAt: string | null;
};

export default async function SuperAdminExamsPage() {
  const userAuthController = new UserAuthController();
  const courses = await userAuthController.listCourses();
  const users = await userAuthController.listAllUsers();

  const students = users
    .filter((user) => user.role === "student")
    .map((user) => ({
      email: user.email,
      name: user.name,
      courseCodes: user.courseCodes,
      isActive: user.isActive,
    }));

  const db = await getDb();
  const examCollection = db.collection<{
    _id: { toHexString(): string };
    courseCodes?: string[];
    courseCode?: string;
    examDate: string;
    durationMinutes: number;
    sets: Array<{ name: string; description: string }> | string[];
    studentSetAssignments: Array<{ studentEmail: string; setName: string }>;
    status: "scheduled" | "started" | "ended" | "terminated";
    startedAt?: Date;
    endedAt?: Date;
  }>("exams");

  const examsRaw = await examCollection.find({}, { sort: { examDate: 1, createdAt: -1 } }).toArray();

  const exams: ExamView[] = examsRaw.map((exam) => ({
    id: exam._id.toHexString(),
    courseCodes: exam.courseCodes?.length ? exam.courseCodes : exam.courseCode ? [exam.courseCode] : [],
    examDate: exam.examDate,
    durationMinutes: exam.durationMinutes,
    sets: (exam.sets ?? []).map((setItem) => {
      if (typeof setItem === "string") {
        return {
          name: setItem,
          description: "",
        };
      }

      return {
        name: setItem.name,
        description: setItem.description ?? "",
      };
    }),
    studentSetAssignments: exam.studentSetAssignments ?? [],
    status: exam.status,
    startedAt: exam.startedAt ? exam.startedAt.toISOString() : null,
    endedAt: exam.endedAt ? exam.endedAt.toISOString() : null,
  }));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Exam Manager</h1>
      <p className="ui-muted text-sm">
        Schedule exams by date, set duration, configure sets, assign one set per student, and start
        exams only between 9:00 AM and 6:00 PM on exam day.
      </p>

      <ExamsManagement
        courses={courses.map((course) => ({ code: course.code, name: course.name }))}
        students={students}
        initialExams={exams}
      />
    </main>
  );
}
