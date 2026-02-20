"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Permissions = {
  canManageCourses: boolean;
  canCreateExam: boolean;
  canCheckExam: boolean;
  canAttemptExam: boolean;
  canViewResults: boolean;
};

type UserItem = {
  email: string;
  name: string;
  role: "superadmin" | "subadmin" | "student";
  isActive: boolean;
  courseCodes: string[];
  permissions: Permissions;
};

type CourseItem = {
  code: string;
  name: string;
};

type ManageUsersTableProps = {
  users: UserItem[];
  courses: CourseItem[];
};

export function ManageUsersTable({ users, courses }: ManageUsersTableProps) {
  const router = useRouter();
  const [stateByEmail, setStateByEmail] = useState<Record<string, UserItem>>(
    Object.fromEntries(users.map((user) => [user.email, user])),
  );
  const [message, setMessage] = useState("");
  const [savingEmail, setSavingEmail] = useState("");

  const sortedUsers = useMemo(() => {
    return [...Object.values(stateByEmail)].sort((a, b) => a.email.localeCompare(b.email));
  }, [stateByEmail]);

  function updateUser(email: string, updater: (prev: UserItem) => UserItem) {
    setStateByEmail((prev) => {
      const current = prev[email];
      if (!current) {
        return prev;
      }

      return {
        ...prev,
        [email]: updater(current),
      };
    });
  }

  async function saveUser(email: string) {
    const user = stateByEmail[email];

    if (!user || user.role === "superadmin") {
      return;
    }

    setMessage("");

    try {
      setSavingEmail(email);
      const response = await fetch("/api/superadmin/users/access", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          isActive: user.isActive,
          permissions: user.permissions,
          courseCodes: user.role === "subadmin" ? user.courseCodes : [],
        }),
      });

      if (!response.ok) {
        setMessage(`Failed to update ${email}`);
        return;
      }

      setMessage(`Updated ${email}`);
      router.refresh();
    } finally {
      setSavingEmail("");
    }
  }

  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/20">
      <h3 className="text-lg font-semibold">All Users</h3>

      <div className="mt-4 grid gap-4">
        {sortedUsers.map((user) => (
          <div key={user.email} className="rounded-md border border-black/10 p-3 dark:border-white/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-foreground/80">{user.email}</p>
                <p className="text-xs uppercase text-foreground/70">{user.role}</p>
              </div>

              {user.role === "superadmin" ? (
                <span className="rounded bg-black/10 px-2 py-1 text-xs dark:bg-white/10">Locked</span>
              ) : (
                <button
                  type="button"
                  onClick={() => saveUser(user.email)}
                  disabled={savingEmail === user.email}
                  className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-60"
                >
                  {savingEmail === user.email ? "Saving..." : "Save"}
                </button>
              )}
            </div>

            {user.role !== "superadmin" ? (
              <div className="mt-3 grid gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={user.isActive}
                    onChange={(event) =>
                      updateUser(user.email, (prev) => ({
                        ...prev,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  <span>Can sign in</span>
                </label>

                {user.role === "subadmin" ? (
                  <div className="rounded border border-black/10 p-2 dark:border-white/20">
                    <p className="text-xs font-medium">Courses</p>
                    <div className="mt-2 grid gap-1">
                      {courses.map((course) => (
                        <label key={`${user.email}-${course.code}`} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={user.courseCodes.includes(course.code)}
                            onChange={(event) =>
                              updateUser(user.email, (prev) => ({
                                ...prev,
                                courseCodes: event.target.checked
                                  ? Array.from(new Set([...prev.courseCodes, course.code]))
                                  : prev.courseCodes.filter((item) => item !== course.code),
                              }))
                            }
                          />
                          <span>
                            {course.code} - {course.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(
                    [
                      ["canManageCourses", "Manage courses"],
                      ["canCreateExam", "Create exams"],
                      ["canCheckExam", "Check exams"],
                      ["canAttemptExam", "Attempt exams"],
                      ["canViewResults", "View results"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={`${user.email}-${key}`} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={user.permissions[key]}
                        onChange={(event) =>
                          updateUser(user.email, (prev) => ({
                            ...prev,
                            permissions: {
                              ...prev.permissions,
                              [key]: event.target.checked,
                            },
                          }))
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {message ? <p className="mt-3 text-sm text-foreground/80">{message}</p> : null}
    </div>
  );
}
