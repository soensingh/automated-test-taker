import { UserPermissions } from "@/modules/users/domain/user.model";
import { CourseRepository } from "@/modules/users/repositories/course.repository";
import { UserRepository } from "@/modules/users/repositories/user.repository";
import { UserService } from "@/modules/users/services/user.service";

export class UserAuthController {
  private readonly userService = new UserService(new UserRepository(), new CourseRepository());

  async ensureSuperAdminExists() {
    await this.userService.ensureSuperAdminUser();
  }

  async onOtpLogin(email: string) {
    return this.userService.provisionUserByLogin(email, "otp");
  }

  async onGoogleLogin(email: string, profileImageUrl?: string | null) {
    return this.userService.provisionUserByLogin(email, "google", profileImageUrl);
  }

  async getAuthUserByEmail(email: string) {
    return this.userService.getAuthUserByEmail(email);
  }

  async canUserSignIn(email: string) {
    return this.userService.canUserSignIn(email);
  }

  async listAllUsers() {
    return this.userService.listAllUsers();
  }

  async listCourses() {
    return this.userService.listCourses();
  }

  async createCourse(name: string, code: string) {
    return this.userService.createCourse(name, code);
  }

  async updateCourseName(code: string, name: string) {
    return this.userService.updateCourseName(code, name);
  }

  async deleteCourse(code: string) {
    return this.userService.deleteCourse(code);
  }

  async createSubadmin(payload: {
    email: string;
    name: string;
    courseCodes: string[];
    permissions?: UserPermissions;
  }) {
    return this.userService.createSubadmin(payload);
  }

  async createStudent(payload: {
    email: string;
    name: string;
    permissions?: UserPermissions;
  }) {
    return this.userService.createStudent(payload);
  }

  async updateUserAccess(payload: {
    email: string;
    isActive?: boolean;
    permissions?: UserPermissions;
    courseCodes?: string[];
    profileImagePath?: string;
    profileImageSource?: "google" | "upload";
  }) {
    return this.userService.updateUserAccess(payload);
  }

  async updateProfileImageByUpload(email: string, fileBuffer: Buffer, originalName: string) {
    return this.userService.updateProfileImageByUpload(email, fileBuffer, originalName);
  }
}
