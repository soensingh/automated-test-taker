"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

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

type StudentItem = {
  email: string;
  name: string;
  role: "student";
  isActive: boolean;
  permissions: Permissions;
};

type StudentsManagementProps = {
  students: StudentItem[];
};

type ImportCandidate = {
  name: string;
  email: string;
  rowNumber: number;
};

type ImportIssue = {
  rowNumber: number;
  reason: string;
};

const REQUIRED_HEADERS = ["name", "email"] as const;

function isEmailValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function StudentsManagement({ students }: StudentsManagementProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeEmail, setActiveEmail] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftStudent, setDraftStudent] = useState<StudentItem | null>(null);
  const [importing, setImporting] = useState(false);
  const [importCandidates, setImportCandidates] = useState<ImportCandidate[]>([]);
  const [importIssues, setImportIssues] = useState<ImportIssue[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [stateByEmail, setStateByEmail] = useState<Record<string, StudentItem>>(
    Object.fromEntries(students.map((student) => [student.email, student])),
  );

  const sortedStudents = useMemo(
    () => [...Object.values(stateByEmail)].sort((a, b) => a.email.localeCompare(b.email)),
    [stateByEmail],
  );

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    setImportCandidates([]);
    setImportIssues([]);

    if (!file) {
      return;
    }

    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const isXlsx = file.name.toLowerCase().endsWith(".xlsx");

    if (!isCsv && !isXlsx) {
      setMessage("Invalid file type. Use .csv or .xlsx");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        setMessage("The file does not contain any sheet.");
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        defval: "",
        blankrows: false,
      });

      if (rows.length < 2) {
        setMessage("File is empty. Add header row and student rows.");
        return;
      }

      const header = rows[0].map((cell) => String(cell).trim().toLowerCase());
      const missingHeaders = REQUIRED_HEADERS.filter((required) => !header.includes(required));

      if (missingHeaders.length > 0) {
        setMessage(`Invalid format. Missing headers: ${missingHeaders.join(", ")}`);
        return;
      }

      const nameIndex = header.indexOf("name");
      const emailIndex = header.indexOf("email");

      const nextCandidates: ImportCandidate[] = [];
      const nextIssues: ImportIssue[] = [];
      const seenEmails = new Set<string>();

      for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex] ?? [];
        const nameValue = String(row[nameIndex] ?? "").trim();
        const emailValue = String(row[emailIndex] ?? "").trim().toLowerCase();
        const rowNumber = rowIndex + 1;

        if (!nameValue && !emailValue) {
          continue;
        }

        if (!nameValue || !emailValue) {
          nextIssues.push({ rowNumber, reason: "Name and Email are required" });
          continue;
        }

        if (!isEmailValid(emailValue)) {
          nextIssues.push({ rowNumber, reason: "Invalid email format" });
          continue;
        }

        if (seenEmails.has(emailValue)) {
          nextIssues.push({ rowNumber, reason: "Duplicate email in file" });
          continue;
        }

        if (stateByEmail[emailValue]) {
          nextIssues.push({ rowNumber, reason: "Student already exists" });
          continue;
        }

        seenEmails.add(emailValue);
        nextCandidates.push({
          name: nameValue,
          email: emailValue,
          rowNumber,
        });
      }

      setImportCandidates(nextCandidates);
      setImportIssues(nextIssues);
      setImportFileName(file.name);

      if (nextCandidates.length === 0) {
        setMessage("No valid students found in file.");
      } else if (nextIssues.length > 0) {
        setMessage(`Verified with issues: ${nextCandidates.length} valid, ${nextIssues.length} invalid`);
      } else {
        setMessage(`Format verified: ${nextCandidates.length} students ready to add`);
      }
    } catch {
      setMessage("Could not read file. Ensure it is a valid CSV or XLSX.");
    }
  }

  async function importVerifiedStudents() {
    if (importCandidates.length === 0) {
      return;
    }

    try {
      setImporting(true);

      let created = 0;
      let failed = 0;

      for (const candidate of importCandidates) {
        const response = await fetch("/api/superadmin/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "student",
            email: candidate.email,
            name: candidate.name,
          }),
        });

        if (!response.ok) {
          failed += 1;
          continue;
        }

        created += 1;

        setStateByEmail((prev) => ({
          ...prev,
          [candidate.email]: {
            email: candidate.email,
            name: candidate.name,
            role: "student",
            isActive: true,
            permissions: {
              canManageCourses: false,
              canCreateExam: false,
              canCheckExam: false,
              canAttemptExam: true,
              canViewResults: true,
            },
          },
        }));
      }

      setMessage(`Import complete: ${created} added, ${failed} failed`);
      setImportCandidates([]);
      setImportIssues([]);
      setImportFileName("");
      router.refresh();
    } finally {
      setImporting(false);
    }
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
          type: "student",
          email,
          name,
        }),
      });

      if (!response.ok) {
        setMessage("Failed to create student");
        return;
      }

      setStateByEmail((prev) => ({
        ...prev,
        [email.toLowerCase()]: {
          email: email.toLowerCase(),
          name: name.trim(),
          role: "student",
          isActive: true,
          permissions: {
            canManageCourses: false,
            canCreateExam: false,
            canCheckExam: false,
            canAttemptExam: true,
            canViewResults: true,
          },
        },
      }));

      setName("");
      setEmail("");
      setMessage("Student created");
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  function openManageDialog(student: StudentItem) {
    setActiveEmail(student.email);
    setDraftStudent({ ...student, permissions: { ...student.permissions } });
    setDialogOpen(true);
  }

  async function saveStudent() {
    if (!draftStudent) {
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
          email: draftStudent.email,
          isActive: draftStudent.isActive,
          permissions: draftStudent.permissions,
        }),
      });

      if (!response.ok) {
        setMessage(`Failed to update ${draftStudent.email}`);
        return;
      }

      setStateByEmail((prev) => ({
        ...prev,
        [draftStudent.email]: draftStudent,
      }));

      setMessage(`Updated ${draftStudent.email}`);
      setDialogOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-10">
      <form onSubmit={handleCreate} className="ui-panel p-5 lg:col-span-4">
        <h2 className="text-lg font-semibold">Create Student</h2>
        <p className="ui-muted mt-1 text-sm">Add student quickly and manage details from the list.</p>

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
          <h3 className="text-sm font-semibold">Bulk Import (.csv / .xlsx)</h3>
          <p className="ui-muted mt-1 text-xs">
            Required format headers: <span className="font-medium">name, email</span>
          </p>

          <label className="ui-button-outline mt-3 inline-block cursor-pointer text-xs">
            Choose File
            <input
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={onFileSelected}
            />
          </label>

          {importFileName ? <p className="ui-muted mt-2 text-xs">File: {importFileName}</p> : null}

          {importCandidates.length > 0 || importIssues.length > 0 ? (
            <div className="mt-3 space-y-2 text-xs">
              <p>
                <span className="font-semibold">Valid rows:</span> {importCandidates.length}
                <span className="ml-3 font-semibold">Invalid rows:</span> {importIssues.length}
              </p>

              {importIssues.length > 0 ? (
                <div className="max-h-28 overflow-auto rounded-md border border-[color:var(--border)] p-2">
                  {importIssues.map((issue) => (
                    <p key={`${issue.rowNumber}-${issue.reason}`}>
                      Row {issue.rowNumber}: {issue.reason}
                    </p>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                className="ui-button-primary w-full"
                disabled={importCandidates.length === 0 || importing}
                onClick={importVerifiedStudents}
              >
                {importing ? "Importing..." : "Add Verified Students"}
              </button>
            </div>
          ) : null}
        </div>

        {message ? <p className="ui-muted mt-3 text-sm">{message}</p> : null}
      </form>

      <div className="ui-panel p-5 lg:col-span-6">
        <h2 className="text-lg font-semibold">Students List</h2>
        <p className="ui-muted mt-1 text-sm">Open each student to manage sign-in and permissions.</p>

        <div className="mt-3 grid gap-3">
          {sortedStudents.length === 0 ? (
            <p className="ui-muted text-sm">No students found.</p>
          ) : (
            sortedStudents.map((student) => (
              <div key={student.email} className="ui-subpanel flex items-center justify-between gap-3 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{student.name}</p>
                    <p className="ui-muted text-xs">{student.email}</p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="ui-button-outline px-2 py-1" aria-label="Student actions" type="button">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Manage</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openManageDialog(student)}>
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
            <DialogTitle>Manage Student</DialogTitle>
            <DialogDescription>Update sign-in and student permissions.</DialogDescription>
          </DialogHeader>

          {draftStudent ? (
            <div className="grid gap-3 text-sm">
              <div className="ui-subpanel px-3 py-2">
                <p className="font-semibold">{draftStudent.name}</p>
                <p className="ui-muted text-xs">{draftStudent.email}</p>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draftStudent.isActive}
                  onChange={(event) =>
                    setDraftStudent((prev) =>
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

              {(
                [
                  ["canAttemptExam", "Attempt exams"],
                  ["canViewResults", "View results"],
                ] as const
              ).map(([key, label]) => (
                <label key={`${activeEmail}-${key}`} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draftStudent.permissions[key]}
                    onChange={(event) =>
                      setDraftStudent((prev) =>
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
          ) : null}

          <DialogFooter>
            <button type="button" className="ui-button-outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </button>
            <button type="button" className="ui-button-primary" disabled={saving} onClick={saveStudent}>
              {saving ? "Saving..." : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
