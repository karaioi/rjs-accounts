import Image from "next/image";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

/**
 * Shell for the signed-in workspace. The header stays thin — the brand, a way
 * back to the dashboard, and the one action every session needs: sign out.
 */
export default function ApplicationLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-[#fffafa]/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="rjs-accounts-logo"
              width={1039}
              height={1059}
              loading="eager"
              className="h-8 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-brand-blue hover:underline"
            >
              Dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
