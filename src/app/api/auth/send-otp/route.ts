import { NextResponse } from "next/server";
import { z } from "zod";

import { hashValue } from "@/lib/hash";
import { sendOtpEmail } from "@/lib/mailer";
import { getDb } from "@/lib/mongodb";
import { generateOtpCode, getOtpExpiryDate } from "@/lib/otp";
import { UserAuthController } from "@/modules/users/controllers/user-auth.controller";

const requestSchema = z.object({
  email: z.email(),
});

const userAuthController = new UserAuthController();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email" },
        {
          status: 400,
        },
      );
    }

    const { email } = parsed.data;
    const canSignIn = await userAuthController.canUserSignIn(email);

    if (!canSignIn) {
      return NextResponse.json(
        { error: "Account is not allowed to sign in" },
        {
          status: 403,
        },
      );
    }

    const otp = generateOtpCode();
    const codeHash = await hashValue(otp);
    const expiresAt = getOtpExpiryDate();

    const db = await getDb();
    const otpCollection = db.collection("otp_codes");

    await otpCollection.updateOne(
      { email },
      {
        $set: {
          email,
          codeHash,
          expiresAt,
          createdAt: new Date(),
        },
      },
      {
        upsert: true,
      },
    );

    await sendOtpEmail(email, otp);

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to send OTP" },
      {
        status: 500,
      },
    );
  }
}
