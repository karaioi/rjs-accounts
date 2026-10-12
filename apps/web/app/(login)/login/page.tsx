import { AuthShell } from "@/components/auth-shell";
import { readSignInEmail } from "@/lib/auth/sign-in-cookie";
import { LoginForm } from "./login-form";

export default async function Login() {
  // A half-finished sign-in (password accepted, code waiting) is remembered in
  // an `rjs-accounts.*` cookie, so a reload keeps the visitor on the OTP screen
  // instead of dropping them back to the credentials form.
  const pendingEmail = await readSignInEmail();

  return (
    <AuthShell>
      <LoginForm initialEmail={pendingEmail} />
    </AuthShell>
  );
}
