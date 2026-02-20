import { getDb } from "@/lib/mongodb";
import { CourseDocument } from "@/modules/users/domain/user.model";

export class CourseRepository {
  async listCourses(): Promise<CourseDocument[]> {
    const db = await getDb();
    const courseCollection = db.collection<CourseDocument>("courses");
    return courseCollection.find({}, { sort: { createdAt: -1 } }).toArray();
  }

  async findByCode(code: string): Promise<CourseDocument | null> {
    const db = await getDb();
    const courseCollection = db.collection<CourseDocument>("courses");
    return courseCollection.findOne({ code: code.toUpperCase() });
  }

  async createCourse(name: string, code: string): Promise<CourseDocument> {
    const normalizedCode = code.trim().toUpperCase();
    const db = await getDb();
    const courseCollection = db.collection<CourseDocument>("courses");

    await courseCollection.updateOne(
      { code: normalizedCode },
      {
        $setOnInsert: {
          name: name.trim(),
          code: normalizedCode,
          subadminEmails: [],
          createdAt: new Date(),
        },
        $set: {
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    const course = await courseCollection.findOne({ code: normalizedCode });

    if (!course) {
      throw new Error("Failed to create course");
    }

    return course;
  }

  async setSubadminsForCourse(code: string, emails: string[]): Promise<void> {
    const db = await getDb();
    const courseCollection = db.collection<CourseDocument>("courses");

    await courseCollection.updateOne(
      { code: code.toUpperCase() },
      {
        $set: {
          subadminEmails: emails.map((email) => email.toLowerCase()),
          updatedAt: new Date(),
        },
      },
    );
  }

  async updateCourseName(code: string, name: string): Promise<void> {
    const db = await getDb();
    const courseCollection = db.collection<CourseDocument>("courses");

    await courseCollection.updateOne(
      { code: code.toUpperCase() },
      {
        $set: {
          name: name.trim(),
          updatedAt: new Date(),
        },
      },
    );
  }

  async deleteCourse(code: string): Promise<void> {
    const db = await getDb();
    const courseCollection = db.collection<CourseDocument>("courses");
    await courseCollection.deleteOne({ code: code.toUpperCase() });
  }
}
