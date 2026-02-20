"use client";

import { FormEvent, useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CourseItem = {
  code: string;
  name: string;
  subadminEmails: string[];
};

type ManagedUser = {
  email: string;
  name: string;
  isActive: boolean;
  courseCodes: string[];
};

type CoursesManagementProps = {
  initialCourses: CourseItem[];
  initialSubadmins: ManagedUser[];
  initialStudents: ManagedUser[];
  initialNextCode: string;
};

type ActiveDialog = "edit" | "delete" | "teachers" | "students" | null;

function getNextSerialCode(courses: CourseItem[]) {
  const maxSerial = courses.reduce((maxValue, course) => {
    const match = course.code.match(/\d+/);

    if (!match) {
      return maxValue;
    }

    const parsed = Number.parseInt(match[0], 10);
    return Number.isFinite(parsed) ? Math.max(maxValue, parsed) : maxValue;
  }, 0);

  return String(maxSerial + 1).padStart(3, "0");
}

export function CoursesManagement({
  initialCourses,
  initialSubadmins,
  initialStudents,
  initialNextCode,
}: CoursesManagementProps) {
  const router = useRouter();

  const [courses, setCourses] = useState(initialCourses);
  const [subadmins, setSubadmins] = useState(initialSubadmins);
  const [students, setStudents] = useState(initialStudents);

  const [courseName, setCourseName] = useState("");
  const [createMessage, setCreateMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [activeCourseCode, setActiveCourseCode] = useState<string>("");
  const [editName, setEditName] = useState("");
  const [savingDialog, setSavingDialog] = useState(false);

  const [selectedTeacherEmails, setSelectedTeacherEmails] = useState<string[]>([]);
  const [selectedStudentEmails, setSelectedStudentEmails] = useState<string[]>([]);

  const activeCourse = useMemo(
    () => courses.find((course) => course.code === activeCourseCode) ?? null,
    [activeCourseCode, courses],
  );

  const nextCode = useMemo(() => {
    if (courses.length === initialCourses.length) {
      return initialNextCode;
    }

    return getNextSerialCode(courses);
  }, [courses, initialCourses.length, initialNextCode]);

  function openEditDialog(course: CourseItem) {
    setActiveCourseCode(course.code);
    setEditName(course.name);
    setActiveDialog("edit");
  }

  function openDeleteDialog(course: CourseItem) {
    setActiveCourseCode(course.code);
    setActiveDialog("delete");
  }

  function openTeachersDialog(course: CourseItem) {
    setActiveCourseCode(course.code);

    const assigned = subadmins
      .filter((subadmin) => subadmin.courseCodes.includes(course.code))
      .map((subadmin) => subadmin.email);

    setSelectedTeacherEmails(assigned);
    setActiveDialog("teachers");
  }

  function openStudentsDialog(course: CourseItem) {
    setActiveCourseCode(course.code);

    const assigned = students
      .filter((student) => student.courseCodes.includes(course.code))
      .map((student) => student.email);

    setSelectedStudentEmails(assigned);
    setActiveDialog("students");
  }

  async function onCreateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateMessage("");

    try {
      setCreating(true);

      const response = await fetch("/api/superadmin/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: courseName, code: nextCode }),
      });

      if (!response.ok) {
        setCreateMessage("Failed to create course");
        return;
      }

      setCourses((prev) => [
        {
          code: nextCode,
          name: courseName.trim(),
          subadminEmails: [],
        },
        ...prev,
      ]);

      setCourseName("");
      setCreateMessage("Course created");
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function onSaveCourseName() {
    if (!activeCourse || editName.trim().length < 2) {
      return;
    }

    try {
      setSavingDialog(true);

      const response = await fetch("/api/superadmin/courses", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: activeCourse.code,
          name: editName.trim(),
        }),
      });

      if (!response.ok) {
        return;
      }

      setCourses((prev) =>
        prev.map((course) =>
          course.code === activeCourse.code
            ? {
                ...course,
                name: editName.trim(),
              }
            : course,
        ),
      );

      setActiveDialog(null);
      router.refresh();
    } finally {
      setSavingDialog(false);
    }
  }

  async function onDeleteCourse() {
    if (!activeCourse) {
      return;
    }

    try {
      setSavingDialog(true);

      const response = await fetch("/api/superadmin/courses", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: activeCourse.code,
        }),
      });

      if (!response.ok) {
        return;
      }

      setCourses((prev) => prev.filter((course) => course.code !== activeCourse.code));
      setSubadmins((prev) =>
        prev.map((subadmin) => ({
          ...subadmin,
          courseCodes: subadmin.courseCodes.filter((code) => code !== activeCourse.code),
        })),
      );
      setStudents((prev) =>
        prev.map((student) => ({
          ...student,
          courseCodes: student.courseCodes.filter((code) => code !== activeCourse.code),
        })),
      );

      setActiveDialog(null);
      router.refresh();
    } finally {
      setSavingDialog(false);
    }
  }

  async function onSaveTeachers() {
    if (!activeCourse) {
      return;
    }

    try {
      setSavingDialog(true);

      await Promise.all(
        subadmins.map(async (subadmin) => {
          const shouldAssign = selectedTeacherEmails.includes(subadmin.email);
          const currentCodes = new Set(subadmin.courseCodes);

          if (shouldAssign) {
            currentCodes.add(activeCourse.code);
          } else {
            currentCodes.delete(activeCourse.code);
          }

          await fetch("/api/superadmin/users/access", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: subadmin.email,
              courseCodes: Array.from(currentCodes),
            }),
          });
        }),
      );

      setSubadmins((prev) =>
        prev.map((subadmin) => {
          const shouldAssign = selectedTeacherEmails.includes(subadmin.email);
          const currentCodes = new Set(subadmin.courseCodes);

          if (shouldAssign) {
            currentCodes.add(activeCourse.code);
          } else {
            currentCodes.delete(activeCourse.code);
          }

          return {
            ...subadmin,
            courseCodes: Array.from(currentCodes),
          };
        }),
      );

      setCourses((prev) =>
        prev.map((course) =>
          course.code === activeCourse.code
            ? {
                ...course,
                subadminEmails: selectedTeacherEmails,
              }
            : course,
        ),
      );

      setActiveDialog(null);
      router.refresh();
    } finally {
      setSavingDialog(false);
    }
  }

  async function onSaveStudents() {
    if (!activeCourse) {
      return;
    }

    try {
      setSavingDialog(true);

      await Promise.all(
        students.map(async (student) => {
          const shouldAssign = selectedStudentEmails.includes(student.email);
          const currentCodes = new Set(student.courseCodes);

          if (shouldAssign) {
            currentCodes.add(activeCourse.code);
          } else {
            currentCodes.delete(activeCourse.code);
          }

          await fetch("/api/superadmin/users/access", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: student.email,
              courseCodes: Array.from(currentCodes),
            }),
          });
        }),
      );

      setStudents((prev) =>
        prev.map((student) => {
          const shouldAssign = selectedStudentEmails.includes(student.email);
          const currentCodes = new Set(student.courseCodes);

          if (shouldAssign) {
            currentCodes.add(activeCourse.code);
          } else {
            currentCodes.delete(activeCourse.code);
          }

          return {
            ...student,
            courseCodes: Array.from(currentCodes),
          };
        }),
      );

      setActiveDialog(null);
      router.refresh();
    } finally {
      setSavingDialog(false);
    }
  }

  function countStudentsForCourse(courseCode: string) {
    return students.filter((student) => student.courseCodes.includes(courseCode)).length;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-10">
      <section className="ui-panel p-5 lg:col-span-4">
        <h2 className="text-lg font-semibold">Create Course</h2>
        <p className="ui-muted mt-1 text-sm">Compact form with auto-generated serial code.</p>

        <form onSubmit={onCreateCourse} className="mt-4 max-w-sm space-y-3">
          <input
            className="ui-input"
            placeholder="Course name"
            value={courseName}
            onChange={(event) => setCourseName(event.target.value)}
            required
          />

          <div className="ui-subpanel px-3 py-2 text-sm">
            <p className="ui-muted text-xs uppercase">Generated Code</p>
            <p className="font-semibold tracking-wide">{nextCode}</p>
          </div>

          <button type="submit" disabled={creating} className="ui-button-primary w-full">
            {creating ? "Creating..." : "Create Course"}
          </button>

          {createMessage ? <p className="ui-muted text-sm">{createMessage}</p> : null}
        </form>
      </section>

      <section className="ui-panel p-5 lg:col-span-6">
        <h2 className="text-lg font-semibold">Course List</h2>
        <p className="ui-muted mt-1 text-sm">Edit, delete, assign teachers and students from each card.</p>

        <div className="mt-4 grid gap-3">
          {courses.length === 0 ? (
            <p className="ui-muted text-sm">No courses yet.</p>
          ) : (
            courses.map((course) => (
              <div key={course.code} className="ui-subpanel flex items-start justify-between gap-3 px-3 py-3">
                <div>
                  <p className="font-semibold">
                    {course.code} - {course.name}
                  </p>
                  <p className="ui-muted mt-1 text-xs">
                    Teachers: {course.subadminEmails.length} • Students: {countStudentsForCourse(course.code)}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="ui-button-outline px-2 py-1" aria-label="Course actions" type="button">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Manage</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openEditDialog(course)}>Edit course</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openTeachersDialog(course)}>
                      Assign teachers
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openStudentsDialog(course)}>
                      Assign students
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600" onClick={() => openDeleteDialog(course)}>
                      Delete course
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </section>

      <Dialog open={activeDialog === "edit"} onOpenChange={(open) => setActiveDialog(open ? "edit" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>Change only the course name.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="ui-subpanel px-3 py-2 text-sm">
              <p className="ui-muted text-xs uppercase">Code</p>
              <p className="font-semibold">{activeCourse?.code}</p>
            </div>

            <input
              className="ui-input"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Course name"
            />
          </div>

          <DialogFooter>
            <button type="button" className="ui-button-outline" onClick={() => setActiveDialog(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="ui-button-primary"
              onClick={onSaveCourseName}
              disabled={savingDialog || editName.trim().length < 2}
            >
              {savingDialog ? "Saving..." : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "delete"}
        onOpenChange={(open) => setActiveDialog(open ? "delete" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              This removes the course and unassigns it from all teachers and students.
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm font-medium">{activeCourse?.code} - {activeCourse?.name}</p>

          <DialogFooter>
            <button type="button" className="ui-button-outline" onClick={() => setActiveDialog(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="ui-button-primary"
              onClick={onDeleteCourse}
              disabled={savingDialog}
            >
              {savingDialog ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "teachers"}
        onOpenChange={(open) => setActiveDialog(open ? "teachers" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Teachers</DialogTitle>
            <DialogDescription>Select subadmins for {activeCourse?.code}.</DialogDescription>
          </DialogHeader>

          <div className="max-h-72 space-y-2 overflow-auto pr-1">
            {subadmins.length === 0 ? (
              <p className="ui-muted text-sm">No subadmins available.</p>
            ) : (
              subadmins.map((subadmin) => {
                const checked = selectedTeacherEmails.includes(subadmin.email);

                return (
                  <label key={subadmin.email} className="ui-subpanel flex items-center gap-2 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setSelectedTeacherEmails((prev) =>
                          event.target.checked
                            ? [...prev, subadmin.email]
                            : prev.filter((email) => email !== subadmin.email),
                        );
                      }}
                    />
                    <span>{subadmin.name} ({subadmin.email})</span>
                  </label>
                );
              })
            )}
          </div>

          <DialogFooter>
            <button type="button" className="ui-button-outline" onClick={() => setActiveDialog(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="ui-button-primary"
              onClick={onSaveTeachers}
              disabled={savingDialog}
            >
              {savingDialog ? "Saving..." : "Save Teachers"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "students"}
        onOpenChange={(open) => setActiveDialog(open ? "students" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Students</DialogTitle>
            <DialogDescription>Select students for {activeCourse?.code}.</DialogDescription>
          </DialogHeader>

          <div className="max-h-72 space-y-2 overflow-auto pr-1">
            {students.length === 0 ? (
              <p className="ui-muted text-sm">No students available.</p>
            ) : (
              students.map((student) => {
                const checked = selectedStudentEmails.includes(student.email);

                return (
                  <label key={student.email} className="ui-subpanel flex items-center gap-2 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setSelectedStudentEmails((prev) =>
                          event.target.checked
                            ? [...prev, student.email]
                            : prev.filter((email) => email !== student.email),
                        );
                      }}
                    />
                    <span>{student.name} ({student.email})</span>
                  </label>
                );
              })
            )}
          </div>

          <DialogFooter>
            <button type="button" className="ui-button-outline" onClick={() => setActiveDialog(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="ui-button-primary"
              onClick={onSaveStudents}
              disabled={savingDialog}
            >
              {savingDialog ? "Saving..." : "Save Students"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
