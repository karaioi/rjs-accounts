"use client";

import { Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

/**
 * Ends the session and returns to the sign-in screen.
 *
 * This is the only way back to `/login`: the Proxy hides the sign-in and
 * sign-up pages for as long as a session exists.
 */
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await authClient.signOut();
    } catch {
      // Clearing the client state is best-effort; navigating away is the point.
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={signOut}
      disabled={pending}
    >
      <HugeiconsIcon icon={Logout01Icon} size={16} strokeWidth={1.5} />
      {pending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
