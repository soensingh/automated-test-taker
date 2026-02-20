import { getDb } from "@/lib/mongodb";
import {
  UserDocument,
  UserPermissions,
  UserProvider,
  UserRole,
} from "@/modules/users/domain/user.model";

type UpsertUserPayload = {
  email: string;
  name: string;
  provider: UserProvider;
  role: UserRole;
  profileImagePath?: string;
  profileImageSource?: "google" | "upload";
  isActive?: boolean;
  permissions?: UserPermissions;
  courseCodes?: string[];
};

type UpdateUserAccessPayload = {
  email: string;
  isActive?: boolean;
  permissions?: UserPermissions;
  courseCodes?: string[];
  profileImagePath?: string;
  profileImageSource?: "google" | "upload";
};

const defaultPermissionsByRole: Record<UserRole, UserPermissions> = {
  superadmin: {
    canManageCourses: true,
    canCreateExam: true,
    canCheckExam: true,
    canAttemptExam: false,
    canViewResults: true,
  },
  subadmin: {
    canManageCourses: false,
    canCreateExam: true,
    canCheckExam: true,
    canAttemptExam: false,
    canViewResults: true,
  },
  student: {
    canManageCourses: false,
    canCreateExam: false,
    canCheckExam: false,
    canAttemptExam: true,
    canViewResults: true,
  },
};

export class UserRepository {
  async findByEmail(email: string): Promise<UserDocument | null> {
    const db = await getDb();
    const userCollection = db.collection<UserDocument>("users");
    return userCollection.findOne({ email: email.toLowerCase() });
  }

  async listAllUsers(): Promise<UserDocument[]> {
    const db = await getDb();
    const userCollection = db.collection<UserDocument>("users");
    return userCollection.find({}, { sort: { createdAt: -1 } }).toArray();
  }

  async upsertUser(payload: UpsertUserPayload): Promise<UserDocument> {
    const db = await getDb();
    const userCollection = db.collection<UserDocument>("users");
    const normalizedEmail = payload.email.toLowerCase();

    await userCollection.updateOne(
      { email: normalizedEmail },
      {
        $set: {
          email: normalizedEmail,
          name: payload.name,
          role: payload.role,
          provider: payload.provider,
          ...(payload.profileImagePath
            ? {
                profileImagePath: payload.profileImagePath,
                profileImageSource: payload.profileImageSource ?? "google",
              }
            : {}),
          isActive: payload.isActive ?? true,
          permissions: payload.permissions ?? defaultPermissionsByRole[payload.role],
          courseCodes: payload.courseCodes ?? [],
          lastLoginAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    const user = await userCollection.findOne({ email: normalizedEmail });

    if (!user) {
      throw new Error("User upsert failed");
    }

    return user;
  }

  async setRoleByEmail(email: string, role: UserRole): Promise<void> {
    const db = await getDb();
    const userCollection = db.collection<UserDocument>("users");

    await userCollection.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          role,
          permissions: defaultPermissionsByRole[role],
        },
      },
    );
  }

  async createManagedUser(payload: UpsertUserPayload): Promise<UserDocument> {
    return this.upsertUser(payload);
  }

  async updateUserAccess(payload: UpdateUserAccessPayload): Promise<void> {
    const db = await getDb();
    const userCollection = db.collection<UserDocument>("users");
    const setPayload: Partial<UserDocument> = {};

    if (typeof payload.isActive === "boolean") {
      setPayload.isActive = payload.isActive;
    }

    if (payload.permissions) {
      setPayload.permissions = payload.permissions;
    }

    if (payload.courseCodes) {
      setPayload.courseCodes = payload.courseCodes;
    }

    if (payload.profileImagePath) {
      setPayload.profileImagePath = payload.profileImagePath;
      setPayload.profileImageSource = payload.profileImageSource ?? "upload";
    }

    if (Object.keys(setPayload).length === 0) {
      return;
    }

    await userCollection.updateOne(
      { email: payload.email.toLowerCase() },
      {
        $set: setPayload,
      },
    );
  }

  async removeCourseCodeFromAllUsers(courseCode: string): Promise<void> {
    const db = await getDb();
    const userCollection = db.collection<UserDocument>("users");

    await userCollection.updateMany(
      { courseCodes: courseCode.toUpperCase() },
      {
        $pull: {
          courseCodes: courseCode.toUpperCase(),
        },
      },
    );
  }

  toAuthUser(user: UserDocument) {
    if (!user._id) {
      throw new Error("User document missing _id");
    }

    return {
      id: user._id.toHexString(),
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.profileImagePath,
      permissions: user.permissions,
      isActive: user.isActive,
      courseCodes: user.courseCodes,
    };
  }
}
