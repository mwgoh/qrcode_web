"use client";

import * as React from "react";
import Link from "next/link";

import { AlertCircle, RotateCcw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * 페이지·서버 컴포넌트에서 잡히지 않은 예외를 받는 경계.
 * 루트 레이아웃 자체가 무너진 경우는 global-error.tsx가 받는다.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  React.useEffect(() => {
    // 원문은 영어인 데다 서버 내부 사정을 담고 있어 화면에는 내보내지 않는다.
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">문제가 발생했습니다</h1>
            <p className="text-sm text-muted-foreground">
              잠시 후 다시 시도해 주세요.
            </p>
            {error.digest ? (
              <p className="pt-1 font-mono text-xs text-muted-foreground">
                오류 번호 {error.digest}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" size="sm" onClick={() => retry()}>
              <RotateCcw className="size-3.5" aria-hidden />
              다시 시도
            </Button>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              처음으로
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
