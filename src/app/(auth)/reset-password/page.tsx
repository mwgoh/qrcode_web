import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "새 비밀번호 설정" };

export default async function ResetPasswordPage() {
  // (auth) 레이아웃에는 인증 가드가 없다. 이 화면은 재설정 링크로 만들어진 세션이 있어야만
  // 의미가 있으므로 여기서 직접 확인하고, 없으면 이유를 붙여 로그인으로 돌려보낸다.
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=reset");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">새 비밀번호 설정</CardTitle>
        <CardDescription>
          {user.email}에 사용할 새 비밀번호를 입력하세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
