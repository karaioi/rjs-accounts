import { redirect } from "next/navigation";

/**
 * The site root is the workspace, not a landing page.
 *
 * `/dashboard` is where a session belongs; anyone without one is bounced on to
 * `/login` by the route protection in `proxy.ts`. Either way the visitor gets
 * one meaningful destination instead of a 404 at the bare origin.
 */
export default function Home() {
  redirect("/dashboard");
}
