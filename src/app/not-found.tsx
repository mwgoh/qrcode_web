import type { Metadata } from "next";
import Link from "next/link";

import { Compass } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "페이지를 찾을 수 없습니다" };

/** 없는 주소로 들어왔을 때와 notFound()가 호출됐을 때 모두 이 화면이 뜬다. */
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Compass className="size-5" aria-hidden />
          </span>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">페이지를 찾을 수 없습니다</h1>
            <p className="text-sm text-muted-foreground">
              주소가 바뀌었거나 삭제된 페이지입니다.
            </p>
          </div>
          <Link href="/" className={cn(buttonVariants({ size: "sm" }))}>
            처음으로
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
