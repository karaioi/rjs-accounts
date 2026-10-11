import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";

export default function Login() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
