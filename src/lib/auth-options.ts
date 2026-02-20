import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { env } from "@/lib/env";
import { verifyHash } from "@/lib/hash";
import { createAppJwt } from "@/lib/jwt";
import { getDb } from "@/lib/mongodb";
import { UserAuthController } from "@/modules/users/controllers/user-auth.controller";

const credentialsSchema = z.object({
  email: z.email(),
  otp: z.string().length(6),
});

const userAuthController = new UserAuthController();

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email OTP",
    credentials: {
      email: { label: "Email", type: "email" },
      otp: { label: "OTP", type: "text" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);

      if (!parsed.success) {
        return null;
      }

      const { email, otp } = parsed.data;
      const db = await getDb();
      const otpCollection = db.collection<{
        _id: ObjectId;
        email: string;
        codeHash: string;
        expiresAt: Date;
      }>("otp_codes");

      const otpRecord = await otpCollection.findOne({ email });

      if (!otpRecord) {
        return null;
      }

      if (otpRecord.expiresAt < new Date()) {
        await otpCollection.deleteOne({ _id: otpRecord._id });
        return null;
      }

      const isOtpValid = await verifyHash(otp, otpRecord.codeHash);

      if (!isOtpValid) {
        return null;
      }

      await otpCollection.deleteOne({ _id: otpRecord._id });

      await userAuthController.ensureSuperAdminExists();
      const authUser = await userAuthController.onOtpLogin(email);
      return authUser;
    },
  }),
];

if (env.googleClientId && env.googleClientSecret) {
  providers.unshift(
    GoogleProvider({
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  secret: env.authSecret ?? env.jwtSecret,
  session: {
    strategy: "jwt",
  },
  providers,
  pages: {
    signIn: "/",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        await userAuthController.ensureSuperAdminExists();
        const canSignIn = await userAuthController.canUserSignIn(user.email);

        if (!canSignIn) {
          return false;
        }

        await userAuthController.onGoogleLogin(user.email, user.image);
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
      }

      if (token.email) {
        const authUser = await userAuthController.getAuthUserByEmail(token.email);

        if (authUser) {
          token.uid = authUser.id;
          token.role = authUser.role;
          token.picture = authUser.image ?? token.picture;
          token.accessToken = createAppJwt({
            sub: authUser.id,
            email: authUser.email,
            role: authUser.role,
          });
        }
      }

      if (user?.email && !token.accessToken) {
        const authUser = await userAuthController.getAuthUserByEmail(user.email);

        if (authUser) {
          token.uid = authUser.id;
          token.role = authUser.role;
          token.picture = authUser.image ?? token.picture;
          token.accessToken = createAppJwt({
            sub: authUser.id,
            email: authUser.email,
            role: authUser.role,
          });
        }
      }

      if (user?.role) {
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = (token.role as "superadmin" | "subadmin" | "student") ?? "student";
        session.user.image = (token.picture as string | undefined) ?? session.user.image;
      }

      session.accessToken = token.accessToken as string;
      return session;
    },
  },
};
