import Link from "next/link";
import { redirect } from "next/navigation";

import { Contact, Download, History, Palette, Wifi } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Wifi,
    title: "7가지 QR 종류",
    body: "웹사이트, 텍스트, 이메일, 전화, 문자, Wi-Fi, 연락처(vCard)를 한 곳에서.",
  },
  {
    icon: Palette,
    title: "색·크기·로고 커스터마이징",
    body: "전경색과 배경색, 여백, 오류 보정 수준을 조절하고 가운데에 로고를 얹습니다.",
  },
  {
    icon: Download,
    title: "PNG · SVG 내려받기",
    body: "웹용 PNG와 인쇄용 벡터 SVG를 모두 지원합니다.",
  },
  {
    icon: History,
    title: "내 기록 보관",
    body: "만든 QR을 계정에 저장해 두고 언제든 불러와 다시 편집합니다.",
  },
] as const;

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/generate");

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Contact className="size-3.5" aria-hidden />
              로그인하면 만든 QR이 기록으로 남습니다
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              필요한 QR 코드를 <span className="text-primary">몇 초 만에</span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground text-pretty">
              링크부터 Wi-Fi 접속 정보, 연락처까지. 원하는 색과 로고를 입혀
              PNG·SVG로 내려받고, 내 계정에 정리해 두세요.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className={cn(buttonVariants({ size: "lg" }), "px-6")}
              >
                무료로 시작하기
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "px-6",
                )}
              >
                로그인
              </Link>
            </div>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="flex gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <feature.icon className="size-4" aria-hidden />
                  </span>
                  <div className="space-y-1">
                    <h2 className="font-medium">{feature.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {feature.body}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-muted-foreground">
          QR 코드 생성기 · Next.js와 Supabase로 만들었습니다.
        </div>
      </footer>
    </>
  );
}
