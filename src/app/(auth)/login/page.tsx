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

/** 메일 링크를 타고 왔다가 실패해 되돌아온 경우의 안내. 키는 리다이렉트에 쓰는 `?error=` 값. */
const LINK_ERRORS: Record<string, string> = {
  confirm:
    "확인 링크가 만료되었거나 이미 사용되었습니다. 다시 로그인하거나 회원가입을 진행해 주세요.",
  reset:
    "비밀번호 재설정 링크가 만료되었거나 이미 사용되었습니다. 재설정을 다시 요청해 주세요.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeRedirectPath(
    typeof params.next === "string" ? params.next : null,
  );
  const linkError =
    typeof params.error === "string" ? LINK_ERRORS[params.error] : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">다시 오셨네요</CardTitle>
        <CardDescription>
          계정에 로그인하면 만든 QR 코드를 기록으로 보관할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {linkError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {linkError}
          </div>
        ) : null}
        <AuthForm mode="login" next={next} />
      </CardContent>
    </Card>
  );
}
