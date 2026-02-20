"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

// Removed unused imports: useState, ChangeEvent, ThemeToggle, LogoutButton

type SuperAdminSidebarProps = {
  email: string;
  image?: string | null;
};

export function SuperAdminSidebar({ email, image }: SuperAdminSidebarProps) {
  const pathname = usePathname();
  // Removed state logic for profileImage and uploading since it's now in settings

  function getNavClass(href: string, exact = false) {
    const currentPath = pathname ?? "";
    const isActive = exact
      ? currentPath === href
      : currentPath === href || currentPath.startsWith(`${href}/`);

    return [
      "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    ].join(" ");
  }

  return (
    <aside className="w-full border-b bg-card p-4 lg:flex lg:h-screen lg:w-72 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-2 px-2">
        <div className="rounded-lg bg-primary p-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-primary-foreground"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <h2 className="font-bold tracking-tight">Superadmin</h2>
          <p className="text-xs text-muted-foreground">Exam Controller</p>
        </div>
      </div>

      <nav className="mt-8 flex flex-col gap-6 px-2">
        <div className="grid gap-1">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Dashboard
          </p>
          <Link className={getNavClass("/dashboard/superadmin", true)} href="/dashboard/superadmin">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
            Overview
          </Link>
        </div>

        <div className="grid gap-1">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Course & Exam Management
          </p>
          <Link className={getNavClass("/dashboard/superadmin/courses")} href="/dashboard/superadmin/courses">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            Courses
          </Link>
          <Link className={getNavClass("/dashboard/superadmin/exams")} href="/dashboard/superadmin/exams">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Exam Manager
          </Link>
        </div>

        <div className="grid gap-1">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            User Management
          </p>
          <Link className={getNavClass("/dashboard/superadmin/students")} href="/dashboard/superadmin/students">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Students
          </Link>
          <Link className={getNavClass("/dashboard/superadmin/subadmins")} href="/dashboard/superadmin/subadmins">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Subadmins
          </Link>
        </div>

        <div className="grid gap-1">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Configuration
          </p>
          <Link className={getNavClass("/dashboard/superadmin/settings")} href="/dashboard/superadmin/settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Settings
          </Link>
        </div>
      </nav>

      <div className="mt-6 lg:mt-auto mx-2 mb-2 group relative">
         {/* Simplified Profile Section */}
         <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3 hover:bg-muted/60 transition-colors cursor-default">
            <div className="relative h-9 w-9 overflow-hidden rounded-full border bg-background">
              {image ? (
                <Image
                  src={image}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-bold text-muted-foreground">
                  {email[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{email}</p>
              <p className="text-xs text-muted-foreground">Superadmin</p>
            </div>
         </div>
         
         {/* Tooltip on Hover */}
         <div className="absolute bottom-full left-0 mb-2 w-full invisible opacity-0 translate-y-2 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50">
            <div className="rounded-lg border bg-popover p-3 shadow-lg text-popover-foreground">
               <p className="text-xs font-semibold">Logged in as</p>
               <p className="text-sm truncate">{email}</p>
               <div className="mt-2 text-xs text-muted-foreground">
                  Role: Superadmin <br/>
                  Status: Active
               </div>
            </div>
         </div>
      </div>
    </aside>
  );
}
