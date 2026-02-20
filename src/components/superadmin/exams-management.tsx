"use client";

import { FormEvent, useMemo, useState } from "react";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
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
};

type StudentItem = {
  email: string;
  name: string;
  courseCodes: string[];
  isActive: boolean;
};

type ExamSet = {
  name: string;
  description: string;
};

type ExamItem = {
  id: string;
  courseCodes: string[];
  examDate: string;
  durationMinutes: number;
  sets: ExamSet[];
  studentSetAssignments: Array<{
    studentEmail: string;
    setName: string;
  }>;
  status: "scheduled" | "started" | "ended" | "terminated";
  startedAt: string | null;
  endedAt: string | null;
};

type ActiveDialog = "edit" | "assign" | "start" | "terminate" | "delete" | null;

type ExamsManagementProps = {
  courses: CourseItem[];
  students: StudentItem[];
  initialExams: ExamItem[];
};

function nextSetName(index: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  if (index < alphabet.length) {
    return alphabet[index];
  }

  return `S${index + 1}`;
}

export function ExamsManagement({ courses, students, initialExams }: ExamsManagementProps) {
  const router = useRouter();

  const [exams, setExams] = useState(initialExams);

  const today = new Date();
  const defaultDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

  const [selectedCourseCodes, setSelectedCourseCodes] = useState<string[]>(courses[0] ? [courses[0].code] : []);
  const [examDate, setExamDate] = useState(defaultDate);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [sets, setSets] = useState<ExamSet[]>([{ name: "A", description: "" }]);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [activeExamId, setActiveExamId] = useState("");
  const [savingDialog, setSavingDialog] = useState(false);

  const [editDate, setEditDate] = useState(defaultDate);
  const [editDuration, setEditDuration] = useState(60);
  const [editCourseCodes, setEditCourseCodes] = useState<string[]>([]);
  const [editSets, setEditSets] = useState<ExamSet[]>([]);
  const [assignmentMap, setAssignmentMap] = useState<Record<string, string>>({});

  const activeExam = useMemo(
    () => exams.find((exam) => exam.id === activeExamId) ?? null,
    [activeExamId, exams],
  );

  const courseNameByCode = useMemo(
    () => Object.fromEntries(courses.map((course) => [course.code, course.name])),
    [courses],
  );

  const sortedExams = useMemo(
    () => [...exams].sort((a, b) => a.examDate.localeCompare(b.examDate)),
    [exams],
  );

  function addCreateSet() {
    setSets((prev) => [...prev, { name: nextSetName(prev.length), description: "" }]);
  }

  function addEditSet() {
    setEditSets((prev) => [...prev, { name: nextSetName(prev.length), description: "" }]);
  }

  function toggleSelectedCourse(code: string) {
    setSelectedCourseCodes((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  }

  function toggleEditCourse(code: string) {
    setEditCourseCodes((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  }

  function selectAllCreateCourses() {
    setSelectedCourseCodes(courses.map((course) => course.code));
  }

  function clearCreateCourses() {
    setSelectedCourseCodes([]);
  }

  function selectAllEditCourses() {
    setEditCourseCodes(courses.map((course) => course.code));
  }

  function clearEditCourses() {
    setEditCourseCodes([]);
  }

  function openEditDialog(exam: ExamItem) {
    setActiveExamId(exam.id);
    setEditDate(exam.examDate);
    setEditDuration(exam.durationMinutes);
    setEditCourseCodes(exam.courseCodes);
    setEditSets(exam.sets.map((setItem) => ({ ...setItem })));
    setActiveDialog("edit");
  }

  function openAssignDialog(exam: ExamItem) {
    setActiveExamId(exam.id);
    const nextMap: Record<string, string> = {};

    for (const assignment of exam.studentSetAssignments) {
      nextMap[assignment.studentEmail] = assignment.setName;
    }

    setAssignmentMap(nextMap);
    setActiveDialog("assign");
  }

  function openStartDialog(exam: ExamItem) {
    setActiveExamId(exam.id);
    setActiveDialog("start");
  }

  function openTerminateDialog(exam: ExamItem) {
    setActiveExamId(exam.id);
    setActiveDialog("terminate");
  }

  function openDeleteDialog(exam: ExamItem) {
    setActiveExamId(exam.id);
    setActiveDialog("delete");
  }

  async function onCreateExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const validSets = sets.filter((setItem) => setItem.name.trim() && setItem.description.trim());

    if (selectedCourseCodes.length === 0 || validSets.length === 0) {
      setMessage("Select courses and complete at least one set with description.");
      return;
    }

    try {
      setCreating(true);

      const response = await fetch("/api/superadmin/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseCodes: selectedCourseCodes,
          examDate,
          durationMinutes,
          sets: validSets,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setMessage(payload.error ?? "Failed to create exam");
        return;
      }

      const payload = (await response.json()) as { exam: ExamItem };

      setExams((prev) => [...prev, payload.exam]);
      setDurationMinutes(60);
      setSets([{ name: "A", description: "" }]);
      setMessage("Exam scheduled");
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function onSaveExamDetails() {
    if (!activeExam) {
      return;
    }

    const validSets = editSets.filter((setItem) => setItem.name.trim() && setItem.description.trim());

    if (editCourseCodes.length === 0 || validSets.length === 0) {
      return;
    }

    try {
      setSavingDialog(true);

      const response = await fetch("/api/superadmin/exams", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update",
          examId: activeExam.id,
          courseCodes: editCourseCodes,
          examDate: editDate,
          durationMinutes: editDuration,
          sets: validSets,
        }),
      });

      if (!response.ok) {
        return;
      }

      const validSetNames = validSets.map((setItem) => setItem.name);

      setExams((prev) =>
        prev.map((exam) =>
          exam.id === activeExam.id
            ? {
                ...exam,
                courseCodes: editCourseCodes,
                examDate: editDate,
                durationMinutes: editDuration,
                sets: validSets,
                studentSetAssignments: exam.studentSetAssignments.filter((entry) =>
                  validSetNames.includes(entry.setName),
                ),
              }
            : exam,
        ),
      );

      setActiveDialog(null);
      router.refresh();
    } finally {
      setSavingDialog(false);
    }
  }

  async function onSaveAssignments() {
    if (!activeExam) {
      return;
    }

    const assignments = Object.entries(assignmentMap)
      .filter(([, setName]) => setName)
      .map(([studentEmail, setName]) => ({ studentEmail, setName }));

    try {
      setSavingDialog(true);

      const response = await fetch("/api/superadmin/exams", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "assignSets",
          examId: activeExam.id,
          assignments,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setMessage(payload.error ?? "Failed to assign sets");
        return;
      }

      setExams((prev) =>
        prev.map((exam) =>
          exam.id === activeExam.id
            ? {
                ...exam,
                studentSetAssignments: assignments,
              }
            : exam,
        ),
      );

      setActiveDialog(null);
      setMessage("Set assignments saved");
      router.refresh();
    } finally {
      setSavingDialog(false);
    }
  }

  async function onStartExam() {
    if (!activeExam) {
      return;
    }

    try {
      setSavingDialog(true);

      const response = await fetch("/api/superadmin/exams", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "start",
          examId: activeExam.id,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setMessage(payload.error ?? "Failed to start exam");
        return;
      }

      setExams((prev) =>
        prev.map((exam) =>
          exam.id === activeExam.id
            ? {
                ...exam,
                status: "started",
                startedAt: new Date().toISOString(),
              }
            : exam,
        ),
      );

      setActiveDialog(null);
      setMessage("Exam started");
      router.refresh();
    } finally {
      setSavingDialog(false);
    }
  }

  async function onTerminateExam() {
    if (!activeExam) {
      return;
    }

    try {
      setSavingDialog(true);

      const response = await fetch("/api/superadmin/exams", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "terminate",
          examId: activeExam.id,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setMessage(payload.error ?? "Failed to terminate exam");
        return;
      }

      setExams((prev) =>
        prev.map((exam) =>
          exam.id === activeExam.id
            ? {
                ...exam,
                status: "terminated",
                endedAt: new Date().toISOString(),
              }
            : exam,
        ),
      );

      setActiveDialog(null);
      setMessage("Exam terminated");
      router.refresh();
    } finally {
      setSavingDialog(false);
    }
  }

  async function onDeleteExam() {
    if (!activeExam) {
      return;
    }

    try {
      setSavingDialog(true);

      const response = await fetch("/api/superadmin/exams", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examId: activeExam.id,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setMessage(payload.error ?? "Failed to delete exam");
        return;
      }

      setExams((prev) => prev.filter((exam) => exam.id !== activeExam.id));
      setActiveDialog(null);
      setMessage("Exam deleted");
      router.refresh();
    } finally {
      setSavingDialog(false);
    }
  }

  const eligibleStudents = useMemo(() => {
    if (!activeExam) {
      return [];
    }

    return students
      .filter(
        (student) =>
          student.isActive &&
          student.courseCodes.some((courseCode) => activeExam.courseCodes.includes(courseCode)),
      )
      .sort((a, b) => a.email.localeCompare(b.email));
  }, [activeExam, students]);

  return (
    <div className="grid gap-6 lg:grid-cols-10">
      <section className="ui-panel p-5 lg:col-span-4">
        <h2 className="text-lg font-semibold">Schedule Exam</h2>
        <p className="ui-muted mt-1 text-sm">Pick multiple courses, date, duration, and define sets.</p>

        <form onSubmit={onCreateExam} className="mt-4 space-y-3">
          <div className="grid gap-1 text-sm">
            <div className="flex items-center justify-between">
              <span>Courses</span>
              <div className="flex items-center gap-2">
                <button type="button" className="ui-button-outline px-2 py-1 text-xs" onClick={selectAllCreateCourses}>
                  Select All
                </button>
                <button type="button" className="ui-button-outline px-2 py-1 text-xs" onClick={clearCreateCourses}>
                  Clear
                </button>
              </div>
            </div>
            <div className="ui-subpanel max-h-36 space-y-2 overflow-auto p-3">
              {courses.map((course) => (
                <label key={course.code} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={selectedCourseCodes.includes(course.code)}
                    onChange={() => toggleSelectedCourse(course.code)}
                  />
                  <span>
                    {course.code} - {course.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[0.85fr_1.15fr]">
            <label className="grid gap-1 text-sm">
              <span>Exam Date</span>
              <input
                type="date"
                className="ui-input"
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
                required
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span>Duration (min)</span>
              <input
                type="number"
                min={15}
                max={600}
                className="ui-input"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(Number(event.target.value || 60))}
              />
            </label>
          </div>

          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Sets</span>
              <button type="button" className="ui-button-outline px-2 py-1" onClick={addCreateSet}>
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {sets.map((setItem, index) => (
              <div key={`create-set-${setItem.name}-${index}`} className="ui-subpanel grid gap-2 p-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Set {setItem.name}</p>
                  {setItem.name !== "A" ? (
                    <button
                      type="button"
                      className="ui-button-outline px-2 py-1"
                      onClick={() => setSets((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <input
                  className="ui-input"
                  placeholder={`Description for Set ${setItem.name}`}
                  value={setItem.description}
                  onChange={(event) =>
                    setSets((prev) =>
                      prev.map((entry, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...entry,
                              description: event.target.value,
                            }
                          : entry,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>

          <button type="submit" className="ui-button-primary w-full" disabled={creating}>
            {creating ? "Scheduling..." : "Schedule Exam"}
          </button>
        </form>

        {message ? <p className="ui-muted mt-3 text-sm">{message}</p> : null}
      </section>

      <section className="ui-panel p-5 lg:col-span-6">
        <h2 className="text-lg font-semibold">Scheduled Exams</h2>
        <p className="ui-muted mt-1 text-sm">Manage schedule, sets and student assignments.</p>

        <div className="mt-4 grid gap-3">
          {sortedExams.length === 0 ? (
            <p className="ui-muted text-sm">No exams scheduled yet.</p>
          ) : (
            sortedExams.map((exam) => {
              const assignedCount = exam.studentSetAssignments.length;

              return (
                <div key={exam.id} className="ui-subpanel flex items-start justify-between gap-3 px-3 py-3">
                  <div>
                    <p className="font-semibold">{exam.courseCodes.join(", ")}</p>
                    <p className="ui-muted mt-1 text-xs">
                      Courses: {exam.courseCodes.map((code) => courseNameByCode[code] ?? code).join(" • ")}
                    </p>
                    <p className="ui-muted mt-1 text-xs">
                      Date: {exam.examDate} • Duration: {exam.durationMinutes} min • Sets: {exam.sets.map((setItem) => setItem.name).join(", ")}
                    </p>
                    <p className="ui-muted mt-1 text-xs">
                      Assigned Students: {assignedCount} • Status: {exam.status}
                    </p>
                    {exam.endedAt ? (
                      <p className="ui-muted mt-1 text-xs">Completed At: {new Date(exam.endedAt).toLocaleString()}</p>
                    ) : null}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="ui-button-outline px-2 py-1" type="button" aria-label="Exam actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Manage</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openEditDialog(exam)}>Edit schedule</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openAssignDialog(exam)}>
                        Assign student sets
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openStartDialog(exam)} disabled={exam.status !== "scheduled"}>
                        Start exam
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openTerminateDialog(exam)}
                        disabled={exam.status !== "started"}
                      >
                        Terminate exam
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openDeleteDialog(exam)} className="text-red-600">
                        Delete exam
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })
          )}
        </div>
      </section>

      <Dialog open={activeDialog === "edit"} onOpenChange={(open) => setActiveDialog(open ? "edit" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Exam Details</DialogTitle>
            <DialogDescription>Update courses, date, duration and set descriptions.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="flex items-center justify-between text-sm">
              <span>Courses</span>
              <div className="flex items-center gap-2">
                <button type="button" className="ui-button-outline px-2 py-1 text-xs" onClick={selectAllEditCourses}>
                  Select All
                </button>
                <button type="button" className="ui-button-outline px-2 py-1 text-xs" onClick={clearEditCourses}>
                  Clear
                </button>
              </div>
            </div>

            <div className="ui-subpanel max-h-36 space-y-2 overflow-auto p-3 text-xs">
              {courses.map((course) => (
                <label key={`edit-course-${course.code}`} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editCourseCodes.includes(course.code)}
                    onChange={() => toggleEditCourse(course.code)}
                  />
                  <span>
                    {course.code} - {course.name}
                  </span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[0.85fr_1.15fr]">
              <input
                type="date"
                className="ui-input"
                value={editDate}
                onChange={(event) => setEditDate(event.target.value)}
              />
              <input
                type="number"
                min={15}
                max={600}
                className="ui-input"
                value={editDuration}
                onChange={(event) => setEditDuration(Number(event.target.value || 60))}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Sets</p>
                <button type="button" className="ui-button-outline px-2 py-1" onClick={addEditSet}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {editSets.map((setItem, index) => (
                <div key={`edit-set-${setItem.name}-${index}`} className="ui-subpanel grid gap-2 p-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Set {setItem.name}</p>
                      {setItem.name !== "A" ? (
                      <button
                        type="button"
                        className="ui-button-outline px-2 py-1"
                        onClick={() => setEditSets((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>

                  <input
                    className="ui-input"
                    value={setItem.description}
                    placeholder={`Description for Set ${setItem.name}`}
                    onChange={(event) =>
                      setEditSets((prev) =>
                        prev.map((entry, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...entry,
                                description: event.target.value,
                              }
                            : entry,
                        ),
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <button type="button" className="ui-button-outline" onClick={() => setActiveDialog(null)}>
              Cancel
            </button>
            <button type="button" className="ui-button-primary" onClick={onSaveExamDetails} disabled={savingDialog}>
              {savingDialog ? "Saving..." : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "assign"} onOpenChange={(open) => setActiveDialog(open ? "assign" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Student Sets</DialogTitle>
            <DialogDescription>
              Each student can have exactly one set for this exam.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 space-y-2 overflow-auto pr-1">
            {eligibleStudents.length === 0 ? (
              <p className="ui-muted text-sm">No active students enrolled in selected courses.</p>
            ) : (
              eligibleStudents.map((student) => (
                <div key={student.email} className="ui-subpanel flex items-center justify-between gap-2 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{student.name}</p>
                    <p className="ui-muted text-xs">{student.email}</p>
                  </div>

                  <select
                    className="ui-input w-40"
                    value={assignmentMap[student.email] ?? ""}
                    onChange={(event) =>
                      setAssignmentMap((prev) => ({
                        ...prev,
                        [student.email]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Unassigned</option>
                    {(activeExam?.sets ?? []).map((setItem) => (
                      <option key={`${student.email}-${setItem.name}`} value={setItem.name}>
                        Set {setItem.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <button type="button" className="ui-button-outline" onClick={() => setActiveDialog(null)}>
              Cancel
            </button>
            <button type="button" className="ui-button-primary" onClick={onSaveAssignments} disabled={savingDialog}>
              {savingDialog ? "Saving..." : "Save Assignments"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "start"} onOpenChange={(open) => setActiveDialog(open ? "start" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Exam</DialogTitle>
            <DialogDescription>
              You can start only on exam date, between 9:00 AM and 6:00 PM.
            </DialogDescription>
          </DialogHeader>

          <div className="ui-subpanel px-3 py-2 text-sm">
            <p className="font-semibold">{activeExam?.courseCodes.join(", ")}</p>
            <p className="ui-muted text-xs">Date: {activeExam?.examDate}</p>
          </div>

          <DialogFooter>
            <button type="button" className="ui-button-outline" onClick={() => setActiveDialog(null)}>
              Cancel
            </button>
            <button type="button" className="ui-button-primary" onClick={onStartExam} disabled={savingDialog}>
              {savingDialog ? "Starting..." : "Start Exam"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "terminate"}
        onOpenChange={(open) => setActiveDialog(open ? "terminate" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Exam</DialogTitle>
            <DialogDescription>
              This will stop the started exam before duration ends.
            </DialogDescription>
          </DialogHeader>

          <div className="ui-subpanel px-3 py-2 text-sm">
            <p className="font-semibold">{activeExam?.courseCodes.join(", ")}</p>
            <p className="ui-muted text-xs">Date: {activeExam?.examDate}</p>
          </div>

          <DialogFooter>
            <button type="button" className="ui-button-outline" onClick={() => setActiveDialog(null)}>
              Cancel
            </button>
            <button type="button" className="ui-button-primary" onClick={onTerminateExam} disabled={savingDialog}>
              {savingDialog ? "Terminating..." : "Terminate"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "delete"} onOpenChange={(open) => setActiveDialog(open ? "delete" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Exam</DialogTitle>
            <DialogDescription>
              This action permanently deletes the exam schedule and assignments.
            </DialogDescription>
          </DialogHeader>

          <div className="ui-subpanel px-3 py-2 text-sm">
            <p className="font-semibold">{activeExam?.courseCodes.join(", ")}</p>
            <p className="ui-muted text-xs">Date: {activeExam?.examDate}</p>
          </div>

          <DialogFooter>
            <button type="button" className="ui-button-outline" onClick={() => setActiveDialog(null)}>
              Cancel
            </button>
            <button type="button" className="ui-button-primary" onClick={onDeleteExam} disabled={savingDialog}>
              {savingDialog ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
