import fs from "node:fs/promises";
import path from "node:path";

const profileDir = path.join(process.cwd(), "public", "uploads", "profiles");

function sanitizeFileSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function extensionFromContentType(contentType: string | null): string {
  if (!contentType) {
    return "jpg";
  }

  if (contentType.includes("png")) {
    return "png";
  }

  if (contentType.includes("webp")) {
    return "webp";
  }

  return "jpg";
}

async function ensureProfileDirectory(): Promise<void> {
  await fs.mkdir(profileDir, { recursive: true });
}

export async function storeProfileImageFromUrl(email: string, imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return null;
    }

    const bytes = await response.arrayBuffer();
    const contentType = response.headers.get("content-type");
    const extension = extensionFromContentType(contentType);

    await ensureProfileDirectory();

    const fileName = `${sanitizeFileSegment(email.toLowerCase())}-${Date.now()}.${extension}`;
    const absolutePath = path.join(profileDir, fileName);
    await fs.writeFile(absolutePath, Buffer.from(bytes));

    return `/uploads/profiles/${fileName}`;
  } catch {
    return null;
  }
}

export async function storeProfileImageBuffer(
  email: string,
  buffer: Buffer,
  originalName: string,
): Promise<string> {
  await ensureProfileDirectory();

  const originalExtension = path.extname(originalName).replace(".", "").toLowerCase();
  const extension = originalExtension || "jpg";
  const fileName = `${sanitizeFileSegment(email.toLowerCase())}-${Date.now()}.${extension}`;
  const absolutePath = path.join(profileDir, fileName);

  await fs.writeFile(absolutePath, buffer);

  return `/uploads/profiles/${fileName}`;
}

export function getProfileUploadDir() {
  return profileDir;
}
