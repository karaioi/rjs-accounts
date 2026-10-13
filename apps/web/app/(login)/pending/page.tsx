import { AuthShell } from "@/components/auth-shell";
import { checkAccountStatus } from "@/lib/api/actions";
import { readSignInEmail } from "@/lib/auth/sign-in-cookie";
import type { PendingPageProps } from "@/lib/data/pending";
import { PendingStatusForm } from "./pending-status-form";

export default async function PendingApproval({
  searchParams,
}: PendingPageProps) {
  const params = await searchParams;
  const pendingCookieEmail = await readSignInEmail();
  const initialEmail = params.email ?? pendingCookieEmail ?? "";

  let initialStatus = null;
  if (initialEmail?.includes("@")) {
    const res = await checkAccountStatus(initialEmail);
    if (res.ok) {
      initialStatus = res.data;
    }
  }

  return (
    <AuthShell>
      <PendingStatusForm
        initialEmail={initialEmail}
        initialStatus={initialStatus}
      />
    </AuthShell>
  );
}
