import { AuthShell } from "@/components/auth-shell";
import { SignUpForm } from "./sign-up-form";

export default function SignUp() {
  return (
    <AuthShell>
      <SignUpForm />
    </AuthShell>
  );
}
