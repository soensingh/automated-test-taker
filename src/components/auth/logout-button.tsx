"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="ui-button-primary bg-destructive text-destructive-foreground hover:bg-destructive/90"
    >
      Logout
    </button>
  );
}
