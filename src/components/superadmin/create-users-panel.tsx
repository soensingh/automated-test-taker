"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CourseOption = {
  code: string;
  name: string;
};

type CreateUsersPanelProps = {
  courses: CourseOption[];
};

export function CreateUsersPanel({ courses }: CreateUsersPanelProps) {
  const router = useRouter();

  const [subadminEmail, setSubadminEmail] = useState("");
  const [subadminName, setSubadminName] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.code.localeCompare(b.code)),
    [courses],
  );

  function toggleCourse(code: string) {
    setSelectedCourses((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  }

  async function createSubadmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      setLoading(true);
      const response = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "subadmin",
          email: subadminEmail,
          name: subadminName,
          courseCodes: selectedCourses,
        }),
      });

      if (!response.ok) {
        setMessage("Failed to create subadmin");
        return;
      }

      setSubadminEmail("");
      setSubadminName("");
      setSelectedCourses([]);
      setMessage("Subadmin created");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function createStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      setLoading(true);
      const response = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "student",
          email: studentEmail,
          name: studentName,
        }),
      });

      if (!response.ok) {
        setMessage("Failed to create student");
        return;
      }

      setStudentEmail("");
      setStudentName("");
      setMessage("Student created");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={createSubadmin} className="rounded-lg border border-black/10 p-4 dark:border-white/20">
        <h3 className="text-lg font-semibold">Create Subadmin</h3>
        <div className="mt-3 grid gap-3">
          <input
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
            placeholder="Name"
            value={subadminName}
            onChange={(event) => setSubadminName(event.target.value)}
            required
          />
          <input
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
            type="email"
            placeholder="Email"
            value={subadminEmail}
            onChange={(event) => setSubadminEmail(event.target.value)}
            required
          />

          <div className="rounded-md border border-black/10 p-3 dark:border-white/20">
            <p className="mb-2 text-sm font-medium">Assign Courses</p>
            {sortedCourses.length === 0 ? (
              <p className="text-xs text-foreground/70">Create courses first.</p>
            ) : (
              <div className="grid gap-2">
                {sortedCourses.map((course) => (
                  <label key={course.code} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedCourses.includes(course.code)}
                      onChange={() => toggleCourse(course.code)}
                    />
                    <span>
                      {course.code} - {course.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
          >
            {loading ? "Saving..." : "Create Subadmin"}
          </button>
        </div>
      </form>

      <form onSubmit={createStudent} className="rounded-lg border border-black/10 p-4 dark:border-white/20">
        <h3 className="text-lg font-semibold">Create Student</h3>
        <div className="mt-3 grid gap-3">
          <input
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
            placeholder="Name"
            value={studentName}
            onChange={(event) => setStudentName(event.target.value)}
            required
          />
          <input
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
            type="email"
            placeholder="Email"
            value={studentEmail}
            onChange={(event) => setStudentEmail(event.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
          >
            {loading ? "Saving..." : "Create Student"}
          </button>
        </div>
      </form>

      {message ? <p className="text-sm text-foreground/80 lg:col-span-2">{message}</p> : null}
    </div>
  );
}
