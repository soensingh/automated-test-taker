import { env } from "@/lib/env";
import { storeProfileImageBuffer, storeProfileImageFromUrl } from "@/lib/profile-image";
import { UserPermissions, UserProvider, UserRole } from "@/modules/users/domain/user.model";
import { CourseRepository } from "@/modules/users/repositories/course.repository";
import { UserRepository } from "@/modules/users/repositories/user.repository";

const DEFAULT_SUPER_ADMIN_EMAIL = "soensingh.techcadd@gmail.com";

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly courseRepository: CourseRepository,
  ) {}

  private isSuperAdminEmail(email: string): boolean {
    const normalizedEmail = email.toLowerCase();
    const superAdminEmail = (env.superAdminEmail ?? DEFAULT_SUPER_ADMIN_EMAIL).toLowerCase();
    return normalizedEmail === superAdminEmail;
  }

  resolveRole(email: string, existingRole?: UserRole): UserRole {
    if (this.isSuperAdminEmail(email)) {
      return "superadmin";
    }

    if (existingRole) {
      return existingRole;
    }

    return "student";
  }

  async ensureSuperAdminUser(): Promise<void> {
    const superAdminEmail = (env.superAdminEmail ?? DEFAULT_SUPER_ADMIN_EMAIL).toLowerCase();
    const existing = await this.userRepository.findByEmail(superAdminEmail);

    if (!existing) {
      await this.userRepository.upsertUser({
        email: superAdminEmail,
        name: superAdminEmail.split("@")[0],
        provider: "google",
        role: "superadmin",
        isActive: true,
      });
      return;
    }

    if (existing.role !== "superadmin") {
      await this.userRepository.setRoleByEmail(superAdminEmail, "superadmin");
    }

    if (!existing.isActive) {
      await this.userRepository.updateUserAccess({
        email: superAdminEmail,
        isActive: true,
      });
    }
  }

  async canUserSignIn(email: string): Promise<boolean> {
    if (this.isSuperAdminEmail(email)) {
      return true;
    }

    const existing = await this.userRepository.findByEmail(email.toLowerCase());

    if (!existing) {
      return false;
    }

    return existing.isActive;
  }

  async provisionUserByLogin(email: string, provider: UserProvider, profileImageUrl?: string | null) {
    const normalizedEmail = email.toLowerCase();
    const canSignIn = await this.canUserSignIn(normalizedEmail);

    if (!canSignIn) {
      return null;
    }

    const existing = await this.userRepository.findByEmail(normalizedEmail);
    const role = this.resolveRole(normalizedEmail, existing?.role);
    let localProfileImage = existing?.profileImagePath;

    if (provider === "google" && profileImageUrl) {
      const downloaded = await storeProfileImageFromUrl(normalizedEmail, profileImageUrl);
      if (downloaded) {
        localProfileImage = downloaded;
      }
    }

    const user = await this.userRepository.upsertUser({
      email: normalizedEmail,
      name: existing?.name ?? normalizedEmail.split("@")[0],
      provider,
      role,
      profileImagePath: localProfileImage,
      profileImageSource: provider === "google" ? "google" : existing?.profileImageSource,
      isActive: existing?.isActive ?? true,
      permissions: existing?.permissions,
      courseCodes: existing?.courseCodes,
    });

    return this.userRepository.toAuthUser(user);
  }

  async getAuthUserByEmail(email: string) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      return null;
    }

    return this.userRepository.toAuthUser(user);
  }

  async listAllUsers() {
    return this.userRepository.listAllUsers();
  }

  async listCourses() {
    return this.courseRepository.listCourses();
  }

  async createCourse(name: string, code: string) {
    return this.courseRepository.createCourse(name, code);
  }

  async updateCourseName(code: string, name: string) {
    const existing = await this.courseRepository.findByCode(code);

    if (!existing) {
      throw new Error("Course not found");
    }

    await this.courseRepository.updateCourseName(code, name);
  }

  async deleteCourse(code: string) {
    const existing = await this.courseRepository.findByCode(code);

    if (!existing) {
      return;
    }

    await this.courseRepository.deleteCourse(code);
    await this.userRepository.removeCourseCodeFromAllUsers(code);
  }

  async createSubadmin(payload: {
    email: string;
    name: string;
    courseCodes: string[];
    permissions?: UserPermissions;
  }) {
    const normalizedEmail = payload.email.toLowerCase();
    const normalizedCourses = payload.courseCodes.map((courseCode) => courseCode.toUpperCase());

    const user = await this.userRepository.createManagedUser({
      email: normalizedEmail,
      name: payload.name,
      provider: "google",
      role: this.isSuperAdminEmail(normalizedEmail) ? "superadmin" : "subadmin",
      isActive: true,
      permissions: payload.permissions,
      courseCodes: normalizedCourses,
    });

    for (const courseCode of normalizedCourses) {
      const course = await this.courseRepository.findByCode(courseCode);

      if (!course) {
        continue;
      }

      const nextEmails = Array.from(new Set([...(course.subadminEmails ?? []), normalizedEmail]));
      await this.courseRepository.setSubadminsForCourse(courseCode, nextEmails);
    }

    return user;
  }

  async createStudent(payload: {
    email: string;
    name: string;
    permissions?: UserPermissions;
  }) {
    return this.userRepository.createManagedUser({
      email: payload.email.toLowerCase(),
      name: payload.name,
      provider: "google",
      role: "student",
      isActive: true,
      permissions: payload.permissions,
      courseCodes: [],
    });
  }

  async updateUserAccess(payload: {
    email: string;
    isActive?: boolean;
    permissions?: UserPermissions;
    courseCodes?: string[];
    profileImagePath?: string;
    profileImageSource?: "google" | "upload";
  }) {
    const normalizedEmail = payload.email.toLowerCase();
    const existing = await this.userRepository.findByEmail(normalizedEmail);

    if (!existing) {
      throw new Error("User not found");
    }

    if (existing.role === "superadmin") {
      return;
    }

    await this.userRepository.updateUserAccess({
      email: normalizedEmail,
      isActive: payload.isActive,
      permissions: payload.permissions,
      courseCodes: payload.courseCodes?.map((courseCode) => courseCode.toUpperCase()),
      profileImagePath: payload.profileImagePath,
      profileImageSource: payload.profileImageSource,
    });

    if (existing.role === "subadmin" && payload.courseCodes) {
      const nextCourseCodes = payload.courseCodes.map((courseCode) => courseCode.toUpperCase());
      const courses = await this.courseRepository.listCourses();

      for (const course of courses) {
        const isAssigned = nextCourseCodes.includes(course.code.toUpperCase());

        const withoutCurrent = (course.subadminEmails ?? []).filter(
          (email) => email.toLowerCase() !== normalizedEmail,
        );

        const nextEmails = isAssigned
          ? Array.from(new Set([...withoutCurrent, normalizedEmail]))
          : withoutCurrent;

        await this.courseRepository.setSubadminsForCourse(course.code, nextEmails);
      }
    }
  }

  async updateProfileImageByUpload(email: string, fileBuffer: Buffer, originalName: string) {
    const existing = await this.userRepository.findByEmail(email.toLowerCase());

    if (!existing) {
      throw new Error("User not found");
    }

    const profileImagePath = await storeProfileImageBuffer(email, fileBuffer, originalName);

    await this.userRepository.updateUserAccess({
      email,
      profileImagePath,
      profileImageSource: "upload",
    });

    return profileImagePath;
  }
}
