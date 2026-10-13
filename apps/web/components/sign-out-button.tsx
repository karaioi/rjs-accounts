"use client";

import { Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cancelSignIn } from "@/lib/auth/actions";
import { authClient } from "@/lib/auth/client";

/**
 * Ends the session and returns to the sign-in screen.
 *
 * This is the only way back to `/login`: the Proxy hides the sign-in and
 * sign-up pages for as long as a session exists.
 */
export function SignOutButton({
  variant = "full",
}: {
  variant?: "full" | "icon" | "popover";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await authClient.signOut();
    } catch {
      // Clearing the client state is best-effort; navigating away is the point.
    }
    // Forget any half-finished sign-in that was still waiting on a code.
    await cancelSignIn();
    router.replace("/login");
    router.refresh();
  }

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={signOut}
        disabled={pending}
        aria-label="Sign out"
        title="Sign out"
        className="text-white hover:bg-white/10 hover:text-white"
      >
        <HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={1.5} />
      </Button>
    );
  }

  if (variant === "popover") {
    return (
      <Button
        type="button"
        variant="destructive"
        size="lg"
        onClick={signOut}
        disabled={pending}
        className="w-full rounded-2xl"
      >
        <HugeiconsIcon icon={Logout01Icon} size={16} strokeWidth={1.5} />
        {pending ? "Signing out..." : "Sign out"}
      </Button>
    );
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
