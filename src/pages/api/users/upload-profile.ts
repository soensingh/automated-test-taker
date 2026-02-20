import type { NextApiRequest, NextApiResponse } from "next";
import fs from "node:fs";
import multer from "multer";
import { getToken } from "next-auth/jwt";

import { getProfileUploadDir } from "@/lib/profile-image";
import { UserAuthController } from "@/modules/users/controllers/user-auth.controller";

declare module "next" {
  interface NextApiRequest {
    file?: Express.Multer.File;
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      const uploadDir = getProfileUploadDir();
      fs.mkdirSync(uploadDir, { recursive: true });
      callback(null, uploadDir);
    },
    filename: (req, file, callback) => {
      const safeEmail = ((req.headers["x-user-email"] as string) || "user")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "_");
      const extension = file.originalname.includes(".")
        ? file.originalname.split(".").pop()
        : "jpg";
      callback(null, `${safeEmail}-${Date.now()}.${extension}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: (req: unknown, res: unknown, cb: (result?: unknown) => void) => void,
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        reject(result);
        return;
      }
      resolve(result);
    });
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.JWT_SECRET,
  });

  if (!token?.email) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userEmailHeader = req.headers["x-user-email"];

  if (!userEmailHeader || typeof userEmailHeader !== "string") {
    res.status(400).json({ error: "Missing user email" });
    return;
  }

  if (token.email.toLowerCase() !== userEmailHeader.toLowerCase()) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    await runMiddleware(req, res, upload.single("file") as unknown as (req: unknown, res: unknown, cb: (result?: unknown) => void) => void);

    if (!req.file) {
      res.status(400).json({ error: "File missing" });
      return;
    }

    const userAuthController = new UserAuthController();
    const profilePath = `/uploads/profiles/${req.file.filename}`;

    await userAuthController.updateUserAccess({
      email: userEmailHeader,
      profileImagePath: profilePath,
      profileImageSource: "upload",
    });

    res.status(200).json({ success: true, profileImagePath: profilePath });
  } catch {
    res.status(500).json({ error: "Failed to upload profile image" });
  }
}
