import jwt from "jsonwebtoken";

import { requireEnv } from "@/lib/env";

type TokenPayload = {
  sub: string;
  email: string;
  role: "superadmin" | "subadmin" | "student";
};

export function createAppJwt(payload: TokenPayload): string {
  return jwt.sign(payload, requireEnv("jwtSecret"), {
    expiresIn: "1h",
    issuer: "automated-test-taker",
  });
}
