import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { QrCode } from "lucide-react";

import { HistoryList, type HistoryItem } from "@/components/qr/history-list";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "내 기록" };

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // RLS가 본인 행만 내보내지만, 조건을 명시해 의도를 코드에도 남긴다.
  const { data, error } = await supabase
    .from("qr_codes")
    .select("id, label, kind, content, options, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(300);

  const items: HistoryItem[] = (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    kind: row.kind,
    content: row.content,
    options: row.options,
    createdAt: row.created_at,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">내 기록</h1>
          <p className="text-sm text-muted-foreground">
            저장한 QR 코드 {items.length}개
          </p>
        </div>
        <Link href="/generate" className={cn(buttonVariants({ size: "sm" }))}>
          새로 만들기
        </Link>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
              <QrCode className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-medium">아직 저장한 QR 코드가 없습니다</p>
              <p className="text-sm text-muted-foreground">
                QR을 만들고 &lsquo;내 기록에 저장&rsquo;을 누르면 여기에 쌓입니다.
              </p>
            </div>
            <Link href="/generate" className={cn(buttonVariants({ size: "sm" }))}>
              첫 QR 만들기
            </Link>
          </CardContent>
        </Card>
      ) : (
        <HistoryList items={items} />
      )}
    </div>
  );
}
