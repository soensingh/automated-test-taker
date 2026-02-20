import nodemailer from "nodemailer";

import { requireEnv } from "@/lib/env";

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const smtpPort = Number(requireEnv("smtpPort"));

  const transporter = nodemailer.createTransport({
    host: requireEnv("smtpHost"),
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: requireEnv("smtpUser"),
      pass: requireEnv("smtpPass"),
    },
  });

  await transporter.sendMail({
    from: requireEnv("smtpFrom"),
    to: email,
    subject: "Your login OTP",
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
  });
}
