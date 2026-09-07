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

export const metadata: Metadata = { title: "회원가입" };

export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  const params = await searchParams;
  const next = safeRedirectPath(
    typeof params.next === "string" ? params.next : null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">계정 만들기</CardTitle>
        <CardDescription>
          이메일로 가입하면 바로 QR 코드를 만들고 저장할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm mode="signup" next={next} />
      </CardContent>
    </Card>
  );
}
