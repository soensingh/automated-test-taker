import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSuperAdminSession } from "@/lib/superadmin-auth";
import { UserAuthController } from "@/modules/users/controllers/user-auth.controller";

const userAuthController = new UserAuthController();

const createSubadminSchema = z.object({
  type: z.literal("subadmin"),
  email: z.email(),
  name: z.string().min(2),
  courseCodes: z.array(z.string().min(1)).default([]),
});

const createStudentSchema = z.object({
  type: z.literal("student"),
  email: z.email(),
  name: z.string().min(2),
});

const createUserSchema = z.discriminatedUnion("type", [
  createSubadminSchema,
  createStudentSchema,
]);

export async function GET() {
  const session = await requireSuperAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await userAuthController.listAllUsers();
  const courses = await userAuthController.listCourses();

  return NextResponse.json({ users, courses });
}

export async function POST(request: Request) {
  const session = await requireSuperAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = parsed.data;

  if (payload.type === "subadmin") {
    await userAuthController.createSubadmin({
      email: payload.email,
      name: payload.name,
      courseCodes: payload.courseCodes,
    });

    return NextResponse.json({ success: true });
  }

  await userAuthController.createStudent({
    email: payload.email,
    name: payload.name,
  });

  return NextResponse.json({ success: true });
}
