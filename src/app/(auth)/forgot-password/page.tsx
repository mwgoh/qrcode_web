import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "비밀번호 찾기" };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">비밀번호 재설정</CardTitle>
        <CardDescription>
          가입할 때 쓴 이메일 주소를 입력하시면, 새 비밀번호를 설정할 수 있는
          링크를 보내드립니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
