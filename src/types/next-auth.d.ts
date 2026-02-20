import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: "superadmin" | "subadmin" | "student";
    isActive?: boolean;
    courseCodes?: string[];
  }

  interface Session {
    user: {
      id: string;
      role: "superadmin" | "subadmin" | "student";
    } & DefaultSession["user"];
    accessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: "superadmin" | "subadmin" | "student";
    accessToken?: string;
  }
}
