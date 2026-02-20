import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSuperAdminSession } from "@/lib/superadmin-auth";
import { UserAuthController } from "@/modules/users/controllers/user-auth.controller";

const userAuthController = new UserAuthController();

const createCourseSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
});

const updateCourseSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
});

const deleteCourseSchema = z.object({
  code: z.string().min(2),
});

export async function GET() {
  const session = await requireSuperAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courses = await userAuthController.listCourses();
  return NextResponse.json({ courses });
}

export async function POST(request: Request) {
  const session = await requireSuperAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createCourseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const course = await userAuthController.createCourse(parsed.data.name, parsed.data.code);
  return NextResponse.json({ success: true, course });
}

export async function PATCH(request: Request) {
  const session = await requireSuperAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateCourseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await userAuthController.updateCourseName(parsed.data.code, parsed.data.name);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await requireSuperAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = deleteCourseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await userAuthController.deleteCourse(parsed.data.code);
  return NextResponse.json({ success: true });
}
