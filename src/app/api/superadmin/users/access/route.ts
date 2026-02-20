import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSuperAdminSession } from "@/lib/superadmin-auth";
import { UserAuthController } from "@/modules/users/controllers/user-auth.controller";

const userAuthController = new UserAuthController();

const permissionsSchema = z.object({
  canManageCourses: z.boolean(),
  canCreateExam: z.boolean(),
  canCheckExam: z.boolean(),
  canAttemptExam: z.boolean(),
  canViewResults: z.boolean(),
});

const payloadSchema = z.object({
  email: z.email(),
  isActive: z.boolean().optional(),
  courseCodes: z.array(z.string()).optional(),
  permissions: permissionsSchema.optional(),
});

export async function PATCH(request: Request) {
  const session = await requireSuperAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await userAuthController.updateUserAccess(parsed.data);
  return NextResponse.json({ success: true });
}
