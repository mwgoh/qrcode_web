"use client";

import * as React from "react";
import Link from "next/link";

import { Check, Copy, Loader2, Pencil, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";

import { deleteQrCodeAction, renameQrCodeAction } from "@/app/(app)/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { drawQr } from "@/lib/qr/render";
import {
  DEFAULT_OPTIONS,
  QR_KIND_LABELS,
  qrOptionsSchema,
  type QrKind,
} from "@/lib/qr/schema";
import { cn } from "@/lib/utils";

export type HistoryItem = {
  id: string;
  label: string;
  kind: string;
  content: string;
  options: unknown;
  createdAt: string;
};

function Thumbnail({ content, options }: { content: string; options: unknown }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // 기록이 수백 개면 화면 밖 썸네일까지 전부 인코딩하느라 목록이 눈에 띄게 버벅인다.
  // 뷰포트에 들어온 것만 그린다. 그리기 전까지는 bg-muted가 자리를 채우고, QR이 캔버스
  // 전체를 배경색으로 덮으므로 그린 뒤에는 가려진다.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parsed = qrOptionsSchema.safeParse(options);
    const base = parsed.success ? parsed.data : DEFAULT_OPTIONS;

    // 썸네일은 작게, 로고 없이 그린다.
    const draw = () => {
      void drawQr(canvas, {
        payload: content,
        options: { ...base, size: 160, logoScale: 0.2 },
        logoSrc: null,
      }).catch(() => undefined);
    };

    if (typeof IntersectionObserver === "undefined") {
      draw();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        draw();
      },
      // 스크롤이 닿기 전에 미리 그려 두면 빈 칸이 보이지 않는다.
      { rootMargin: "300px" },
    );

    observer.observe(canvas);
    return () => observer.disconnect();
  }, [content, options]);

  return (
    <canvas
      ref={canvasRef}
      className="size-20 shrink-0 rounded-lg border border-border bg-muted"
      aria-hidden
    />
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const [isPending, startTransition] = React.useTransition();
  const [editing, setEditing] = React.useState(false);
  const [label, setLabel] = React.useState(item.label);
  const [copied, setCopied] = React.useState(false);

  const kindLabel =
    QR_KIND_LABELS[item.kind as QrKind] ?? item.kind;

  function submitRename() {
    const next = label.trim();
    if (next === item.label) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await renameQrCodeAction(item.id, next);
      if (result.ok) {
        setEditing(false);
        toast.success("이름을 변경했습니다.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove() {
    if (!window.confirm(`'${item.label}' 기록을 삭제할까요?`)) return;
    startTransition(async () => {
      const result = await deleteQrCodeAction(item.id);
      if (result.ok) toast.success("삭제했습니다.");
      else toast.error(result.error);
    });
  }

  async function copyContent() {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("클립보드에 복사하지 못했습니다.");
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Thumbnail content={item.content} options={item.options} />

        <div className="min-w-0 flex-1 space-y-1">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={label}
                maxLength={80}
                autoFocus
                onChange={(event) => setLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitRename();
                  if (event.key === "Escape") {
                    setLabel(item.label);
                    setEditing(false);
                  }
                }}
              />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="이름 저장"
                disabled={isPending}
                onClick={submitRename}
              >
                <Check className="size-3.5" aria-hidden />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="취소"
                onClick={() => {
                  setLabel(item.label);
                  setEditing(false);
                }}
              >
                <X className="size-3.5" aria-hidden />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="truncate font-medium">{item.label}</h3>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="이름 변경"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3" aria-hidden />
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{kindLabel}</Badge>
            <time dateTime={item.createdAt}>
              {new Date(item.createdAt).toLocaleString("ko-KR", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          </div>

          <p className="truncate font-mono text-xs text-muted-foreground">
            {item.content}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={copyContent}
            aria-label="내용 복사"
          >
            {copied ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <Copy className="size-3.5" aria-hidden />
            )}
            복사
          </Button>
          <Link
            href={`/generate?load=${item.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Wand2 className="size-3.5" aria-hidden />
            불러오기
          </Link>
          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={remove}
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-3.5" aria-hidden />
            )}
            삭제
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function HistoryList({ items }: { items: HistoryItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <HistoryRow key={item.id} item={item} />
      ))}
    </div>
  );
}
