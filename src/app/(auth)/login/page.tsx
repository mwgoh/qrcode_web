import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeRedirectPath(
    typeof params.next === "string" ? params.next : null,
  );
  const confirmFailed = params.error === "confirm";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">다시 오셨네요</CardTitle>
        <CardDescription>
          계정에 로그인하면 만든 QR 코드를 기록으로 보관할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {confirmFailed ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            확인 링크가 만료되었거나 이미 사용되었습니다. 다시 로그인하거나
            회원가입을 진행해 주세요.
          </div>
        ) : null}
        <AuthForm mode="login" next={next} />
      </CardContent>
    </Card>
  );
}
