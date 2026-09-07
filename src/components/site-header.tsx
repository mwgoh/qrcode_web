import Link from "next/link";

import { LogOut, QrCode } from "lucide-react";

import { signOutAction } from "@/app/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/generate", label: "생성" },
  { href: "/history", label: "내 기록" },
] as const;

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
        <Link
          href={user ? "/generate" : "/"}
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <QrCode className="size-4" aria-hidden />
          </span>
          QR 코드 생성기
        </Link>

        {user ? (
          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <>
              <span
                className="hidden max-w-[16rem] truncate text-sm text-muted-foreground md:inline"
                title={user.email ?? undefined}
              >
                {user.email}
              </span>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm">
                  <LogOut className="size-3.5" aria-hidden />
                  로그아웃
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
