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

type Permissions = {
  canManageCourses: boolean;
  canCreateExam: boolean;
  canCheckExam: boolean;
  canAttemptExam: boolean;
  canViewResults: boolean;
};

type CourseItem = {
  code: string;
  name: string;
};

type SubadminItem = {
  email: string;
  name: string;
  role: "subadmin";
  isActive: boolean;
  courseCodes: string[];
  permissions: Permissions;
};

type SubadminsManagementProps = {
  subadmins: SubadminItem[];
  courses: CourseItem[];
};

export function SubadminsManagement({ subadmins, courses }: SubadminsManagementProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeEmail, setActiveEmail] = useState("");
  const [draftSubadmin, setDraftSubadmin] = useState<SubadminItem | null>(null);
  const [stateByEmail, setStateByEmail] = useState<Record<string, SubadminItem>>(
    Object.fromEntries(subadmins.map((subadmin) => [subadmin.email, subadmin])),
  );

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.code.localeCompare(b.code)),
    [courses],
  );
  const sortedSubadmins = useMemo(
    () => [...Object.values(stateByEmail)].sort((a, b) => a.email.localeCompare(b.email)),
    [stateByEmail],
  );

  function toggleCreateCourse(code: string) {
    setSelectedCourses((prev) =>
      prev.includes(code) ? prev.filter((courseCode) => courseCode !== code) : [...prev, code],
    );
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      setCreating(true);
      const response = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "subadmin",
          email,
          name,
          courseCodes: selectedCourses,
        }),
      });

      if (!response.ok) {
        setMessage("Failed to create subadmin");
        return;
      }

      setStateByEmail((prev) => ({
        ...prev,
        [email.toLowerCase()]: {
          email: email.toLowerCase(),
          name: name.trim(),
          role: "subadmin",
          isActive: true,
          courseCodes: selectedCourses,
          permissions: {
            canManageCourses: false,
            canCreateExam: true,
            canCheckExam: true,
            canAttemptExam: false,
            canViewResults: true,
          },
        },
      }));

      setName("");
      setEmail("");
      setSelectedCourses([]);
      setMessage("Subadmin created");
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  function openManageDialog(subadmin: SubadminItem) {
    setActiveEmail(subadmin.email);
    setDraftSubadmin({
      ...subadmin,
      courseCodes: [...subadmin.courseCodes],
      permissions: { ...subadmin.permissions },
    });
    setDialogOpen(true);
  }

  async function saveSubadmin() {
    if (!draftSubadmin) {
      return;
    }

    setMessage("");

    try {
      setSaving(true);
      const response = await fetch("/api/superadmin/users/access", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: draftSubadmin.email,
          isActive: draftSubadmin.isActive,
          permissions: draftSubadmin.permissions,
          courseCodes: draftSubadmin.courseCodes,
        }),
      });

      if (!response.ok) {
        setMessage(`Failed to update ${draftSubadmin.email}`);
        return;
      }

      setStateByEmail((prev) => ({
        ...prev,
        [draftSubadmin.email]: draftSubadmin,
      }));

      setMessage(`Updated ${draftSubadmin.email}`);
      setDialogOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-10">
      <form onSubmit={handleCreate} className="ui-panel p-5 lg:col-span-4">
        <h2 className="text-lg font-semibold">Create Subadmin</h2>
        <p className="ui-muted mt-1 text-sm">Create and then manage access from the right panel.</p>

        <div className="mt-4 grid max-w-sm gap-3">
          <input
            className="ui-input"
            placeholder="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <input
            className="ui-input"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="ui-button-primary w-full"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>

        <div className="ui-subpanel mt-4 p-3">
          <p className="text-sm font-medium">Assign Courses</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {sortedCourses.length === 0 ? (
              <p className="ui-muted text-xs">No courses available. Create courses first.</p>
            ) : (
              sortedCourses.map((course) => (
                <label key={course.code} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={selectedCourses.includes(course.code)}
                    onChange={() => toggleCreateCourse(course.code)}
                  />
                  <span>
                    {course.code} - {course.name}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {message ? <p className="ui-muted mt-3 text-sm">{message}</p> : null}
      </form>

      <div className="ui-panel p-5 lg:col-span-6">
        <h2 className="text-lg font-semibold">Subadmins List</h2>
        <p className="ui-muted mt-1 text-sm">Open each row to manage courses and permissions.</p>

        <div className="mt-3 grid gap-3">
          {sortedSubadmins.length === 0 ? (
            <p className="ui-muted text-sm">No subadmins found.</p>
          ) : (
            sortedSubadmins.map((subadmin) => (
              <div key={subadmin.email} className="ui-subpanel flex items-center justify-between gap-3 p-3">
                <div>
                  <div>
                    <p className="text-sm font-semibold">{subadmin.name}</p>
                    <p className="ui-muted text-xs">{subadmin.email}</p>
                  </div>
                  <p className="ui-muted mt-1 text-xs">Courses: {subadmin.courseCodes.length}</p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="ui-button-outline px-2 py-1" aria-label="Subadmin actions" type="button">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Manage</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openManageDialog(subadmin)}>
                      Edit access
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Subadmin</DialogTitle>
            <DialogDescription>Update sign-in, courses, and permissions.</DialogDescription>
          </DialogHeader>

          {draftSubadmin ? (
            <div className="grid gap-3 text-sm">
              <div className="ui-subpanel px-3 py-2">
                <p className="font-semibold">{draftSubadmin.name}</p>
                <p className="ui-muted text-xs">{draftSubadmin.email}</p>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draftSubadmin.isActive}
                  onChange={(event) =>
                    setDraftSubadmin((prev) =>
                      prev
                        ? {
                            ...prev,
                            isActive: event.target.checked,
                          }
                        : prev,
                    )
                  }
                />
                <span>Can sign in</span>
              </label>

              <div className="ui-subpanel p-3">
                <p className="text-xs font-semibold uppercase tracking-wide">Courses</p>
                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                  {sortedCourses.map((course) => (
                    <label key={`${activeEmail}-${course.code}`} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={draftSubadmin.courseCodes.includes(course.code)}
                        onChange={(event) =>
                          setDraftSubadmin((prev) => {
                            if (!prev) {
                              return prev;
                            }

                            return {
                              ...prev,
                              courseCodes: event.target.checked
                                ? Array.from(new Set([...prev.courseCodes, course.code]))
                                : prev.courseCodes.filter((courseCode) => courseCode !== course.code),
                            };
                          })
                        }
                      />
                      <span>
                        {course.code} - {course.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {(
                  [
                    ["canManageCourses", "Manage courses"],
                    ["canCreateExam", "Create exams"],
                    ["canCheckExam", "Check exams"],
                    ["canViewResults", "View results"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={`${activeEmail}-${key}`} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draftSubadmin.permissions[key]}
                      onChange={(event) =>
                        setDraftSubadmin((prev) =>
                          prev
                            ? {
                                ...prev,
                                permissions: {
                                  ...prev.permissions,
                                  [key]: event.target.checked,
                                },
                              }
                            : prev,
                        )
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <button type="button" className="ui-button-outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </button>
            <button type="button" className="ui-button-primary" onClick={saveSubadmin} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
