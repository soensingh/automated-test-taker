import { ObjectId } from "mongodb";

export type UserRole = "superadmin" | "subadmin" | "student";

export type UserProvider = "otp" | "google";

export type UserPermissions = {
  canManageCourses: boolean;
  canCreateExam: boolean;
  canCheckExam: boolean;
  canAttemptExam: boolean;
  canViewResults: boolean;
};

export type UserDocument = {
  _id?: ObjectId;
  email: string;
  name: string;
  role: UserRole;
  profileImagePath?: string;
  profileImageSource?: "google" | "upload";
  isActive: boolean;
  permissions: UserPermissions;
  courseCodes: string[];
  provider: UserProvider;
  createdAt: Date;
  lastLoginAt: Date;
};

export type CourseDocument = {
  _id?: ObjectId;
  name: string;
  code: string;
  subadminEmails: string[];
  createdAt: Date;
  updatedAt: Date;
};

