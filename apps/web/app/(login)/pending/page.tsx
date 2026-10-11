import { Clock01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Reveal } from "@/components/motion/reveal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Landing spot for a signed-in account that is not yet approved. Kept outside
 * the protected matcher so it stays reachable while access is pending.
 */
export default function PendingApproval() {
  return (
    <AuthShell>
      <Reveal variant="scale-in" className="w-full max-w-md">
        <Card className="relative w-full rounded-3xl border-black/10 bg-[#fffafa]/70 shadow-[0_24px_80px_-32px_rgba(8,47,73,0.4)]">
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Awaiting approval
            </CardTitle>
            <CardDescription>
              Your account has been created but access has not been granted yet.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-brand-blue/10 text-brand-blue">
                <HugeiconsIcon icon={Clock01Icon} size={28} strokeWidth={1.5} />
              </span>

              <p className="text-sm text-muted-foreground">
                An administrator will review your request. You&apos;ll be able
                to sign in once your account is approved.
              </p>

              <Link
                href="/login"
                className="text-sm font-medium text-brand-blue underline-offset-4 hover:text-brand-blue/80 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </AuthShell>
  );
}
