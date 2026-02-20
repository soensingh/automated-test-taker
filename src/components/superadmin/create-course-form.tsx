"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CreateCourseForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      setLoading(true);
      const response = await fetch("/api/superadmin/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, code }),
      });

      if (!response.ok) {
        setMessage("Failed to create course");
        return;
      }

      setName("");
      setCode("");
      setMessage("Course saved");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-black/10 p-4 dark:border-white/20">
      <h3 className="text-lg font-semibold">Create Course</h3>
      <div className="mt-3 grid gap-3">
        <input
          className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
          placeholder="Course name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <input
          className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm uppercase dark:border-white/20"
          placeholder="Course code (e.g. MATH101)"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Course"}
        </button>
      </div>
      {message ? <p className="mt-2 text-sm text-foreground/80">{message}</p> : null}
    </form>
  );
}
