import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/mongodb";
import { requireSuperAdminSession } from "@/lib/superadmin-auth";

const examSetSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

const createExamSchema = z.object({
  courseCodes: z.array(z.string().min(1)).min(1),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.number().int().min(15).max(600),
  sets: z.array(examSetSchema).min(1),
});

const updateExamSchema = z.object({
  action: z.literal("update"),
  examId: z.string().min(1),
  courseCodes: z.array(z.string().min(1)).min(1),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.number().int().min(15).max(600),
  sets: z.array(examSetSchema).min(1),
});

const assignSetsSchema = z.object({
  action: z.literal("assignSets"),
  examId: z.string().min(1),
  assignments: z.array(
    z.object({
      studentEmail: z.email(),
      setName: z.string().min(1),
    }),
  ),
});

const startExamSchema = z.object({
  action: z.literal("start"),
  examId: z.string().min(1),
});

const terminateExamSchema = z.object({
  action: z.literal("terminate"),
  examId: z.string().min(1),
});

const deleteExamSchema = z.object({
  examId: z.string().min(1),
});

const patchSchema = z.discriminatedUnion("action", [
  updateExamSchema,
  assignSetsSchema,
  startExamSchema,
  terminateExamSchema,
]);

type ExamDocument = {
  _id?: ObjectId;
  courseCodes: string[];
  courseCode?: string;
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
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export async function GET() {
  const session = await requireSuperAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const examCollection = db.collection<ExamDocument>("exams");
  const exams = await examCollection.find({}, { sort: { examDate: 1, createdAt: -1 } }).toArray();

  const now = new Date();

  for (const exam of exams) {
    if (exam.status !== "started" || !exam.startedAt) {
      continue;
    }

    const plannedEnd = new Date(exam.startedAt.getTime() + exam.durationMinutes * 60 * 1000);

    if (now >= plannedEnd) {
      await examCollection.updateOne(
        { _id: exam._id, status: "started" },
        {
          $set: {
            status: "ended",
            endedAt: plannedEnd,
            updatedAt: now,
          },
        },
      );
      exam.status = "ended";
      exam.endedAt = plannedEnd;
    }
  }

  return NextResponse.json({
    exams: exams.map((exam) => ({
      id: exam._id?.toHexString(),
      courseCodes: exam.courseCodes?.length
        ? exam.courseCodes
        : exam.courseCode
          ? [exam.courseCode]
          : [],
      examDate: exam.examDate,
      durationMinutes: exam.durationMinutes,
      sets: (exam.sets ?? []).map((setItem) => {
        if (typeof setItem === "string") {
          return { name: setItem, description: "" };
        }

        return {
          name: setItem.name,
          description: setItem.description ?? "",
        };
      }),
      studentSetAssignments: exam.studentSetAssignments ?? [],
      status: exam.status,
      startedAt: exam.startedAt?.toISOString() ?? null,
      endedAt: exam.endedAt?.toISOString() ?? null,
      createdAt: exam.createdAt.toISOString(),
      updatedAt: exam.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireSuperAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createExamSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = await getDb();
  const courseCollection = db.collection<{ code: string }>("courses");
  const examCollection = db.collection<ExamDocument>("exams");

  const normalizedCourseCodes = Array.from(
    new Set(parsed.data.courseCodes.map((courseCode) => courseCode.toUpperCase())),
  );

  const courses = await courseCollection.find({ code: { $in: normalizedCourseCodes } }).toArray();

  if (courses.length !== normalizedCourseCodes.length) {
    return NextResponse.json({ error: "One or more courses not found" }, { status: 404 });
  }

  const uniqueSetNames = new Set<string>();
  const sets = parsed.data.sets
    .map((setItem) => ({
      name: setItem.name.trim(),
      description: setItem.description.trim(),
    }))
    .filter((setItem) => setItem.name.length > 0)
    .filter((setItem) => {
      if (uniqueSetNames.has(setItem.name)) {
        return false;
      }

      uniqueSetNames.add(setItem.name);
      return true;
    });

  if (sets.length === 0) {
    return NextResponse.json({ error: "At least one set is required" }, { status: 400 });
  }

  const now = new Date();
  const payload: ExamDocument = {
    courseCodes: normalizedCourseCodes,
    examDate: parsed.data.examDate,
    durationMinutes: parsed.data.durationMinutes,
    sets,
    studentSetAssignments: [],
    status: "scheduled",
    createdAt: now,
    updatedAt: now,
  };

  const result = await examCollection.insertOne(payload);

  return NextResponse.json({
    success: true,
    exam: {
      id: result.insertedId.toHexString(),
      ...payload,
      startedAt: null,
      endedAt: null,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await requireSuperAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = await getDb();
  const examCollection = db.collection<ExamDocument>("exams");
  const userCollection = db.collection<{ email: string; courseCodes: string[]; role: string }>("users");

  const exam = await examCollection.findOne({ _id: new ObjectId(parsed.data.examId) });

  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  if (parsed.data.action === "update") {
    const normalizedCourseCodes = Array.from(
      new Set(parsed.data.courseCodes.map((courseCode) => courseCode.toUpperCase())),
    );

    const courses = await db
      .collection<{ code: string }>("courses")
      .find({ code: { $in: normalizedCourseCodes } })
      .toArray();

    if (courses.length !== normalizedCourseCodes.length) {
      return NextResponse.json({ error: "One or more courses not found" }, { status: 404 });
    }

    const uniqueSetNames = new Set<string>();
    const uniqueSets = parsed.data.sets
      .map((setItem) => ({
        name: setItem.name.trim(),
        description: setItem.description.trim(),
      }))
      .filter((setItem) => setItem.name.length > 0)
      .filter((setItem) => {
        if (uniqueSetNames.has(setItem.name)) {
          return false;
        }

        uniqueSetNames.add(setItem.name);
        return true;
      });

    if (uniqueSets.length === 0) {
      return NextResponse.json({ error: "At least one set is required" }, { status: 400 });
    }

    const setNames = uniqueSets.map((setItem) => setItem.name);

    const validExistingAssignments = exam.studentSetAssignments.filter((assignment) =>
      setNames.includes(assignment.setName),
    );

    await examCollection.updateOne(
      { _id: exam._id },
      {
        $set: {
          courseCodes: normalizedCourseCodes,
          examDate: parsed.data.examDate,
          durationMinutes: parsed.data.durationMinutes,
          sets: uniqueSets,
          studentSetAssignments: validExistingAssignments,
          updatedAt: new Date(),
        },
      },
    );

    return NextResponse.json({ success: true });
  }

  if (parsed.data.action === "assignSets") {
    const examCourseCodes = exam.courseCodes?.length
      ? exam.courseCodes
      : exam.courseCode
        ? [exam.courseCode]
        : [];
    const examSetNames = (exam.sets ?? []).map((setItem) =>
      typeof setItem === "string" ? setItem : setItem.name,
    );

    const seen = new Set<string>();

    for (const assignment of parsed.data.assignments) {
      const email = assignment.studentEmail.toLowerCase();

      if (seen.has(email)) {
        return NextResponse.json({ error: "Each student can be assigned only one set" }, { status: 400 });
      }

      if (!examSetNames.includes(assignment.setName)) {
        return NextResponse.json({ error: `Invalid set for ${email}` }, { status: 400 });
      }

      seen.add(email);
    }

    const assignedEmails = parsed.data.assignments.map((assignment) => assignment.studentEmail.toLowerCase());
    const enrolledStudents = await userCollection
      .find({
        role: "student",
        email: { $in: assignedEmails },
        courseCodes: { $in: examCourseCodes },
      })
      .toArray();

    if (enrolledStudents.length !== assignedEmails.length) {
      return NextResponse.json({ error: "Only students enrolled in the course can be assigned" }, { status: 400 });
    }

    await examCollection.updateOne(
      { _id: exam._id },
      {
        $set: {
          studentSetAssignments: parsed.data.assignments.map((assignment) => ({
            studentEmail: assignment.studentEmail.toLowerCase(),
            setName: assignment.setName,
          })),
          updatedAt: new Date(),
        },
      },
    );

    return NextResponse.json({ success: true });
  }

  if (parsed.data.action === "terminate") {
    if (exam.status !== "started") {
      return NextResponse.json({ error: "Only started exams can be terminated" }, { status: 400 });
    }

    const now = new Date();

    await examCollection.updateOne(
      { _id: exam._id },
      {
        $set: {
          status: "terminated",
          endedAt: now,
          updatedAt: now,
        },
      },
    );

    return NextResponse.json({ success: true });
  }

  const now = new Date();
  const localIsoDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  const hour = now.getHours();

  if (exam.examDate !== localIsoDate) {
    return NextResponse.json({ error: "Exam can only be started on the scheduled date" }, { status: 400 });
  }

  if (hour < 9 || hour >= 18) {
    return NextResponse.json({ error: "Exam can only be started between 9:00 and 18:00" }, { status: 400 });
  }

  if (exam.status !== "scheduled") {
    return NextResponse.json({ error: "Only scheduled exams can be started" }, { status: 400 });
  }

  await examCollection.updateOne(
    { _id: exam._id },
    {
      $set: {
        status: "started",
        startedAt: now,
        updatedAt: now,
      },
    },
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await requireSuperAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = deleteExamSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = await getDb();
  const examCollection = db.collection<ExamDocument>("exams");

  await examCollection.deleteOne({ _id: new ObjectId(parsed.data.examId) });

  return NextResponse.json({ success: true });
}
