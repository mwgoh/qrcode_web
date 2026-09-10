"use client";

import * as React from "react";
import Link from "next/link";

import { Loader2 } from "lucide-react";

import {
  requestPasswordResetAction,
  type AuthFormState,
} from "@/app/auth/actions";
import { FieldError, FormFeedback } from "@/components/auth/auth-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL: AuthFormState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = React.useActionState(
    requestPasswordResetAction,
    INITIAL,
  );

  // 메일을 보낸 뒤에는 입력 폼을 닫는다. 같은 주소로 반복 발송하면 한도에 걸린다.
  const sent = Boolean(state.notice);

  return (
    <div className="space-y-4">
      <FormFeedback error={state.error} notice={state.notice} />

      {sent ? (
        <p className="text-sm text-muted-foreground">
          메일이 오지 않으면 스팸함을 확인해 보시고, 그래도 없으면 잠시 후 다시
          시도해 주세요.
        </p>
      ) : (
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(state.fieldErrors?.email)}
            />
            <FieldError message={state.fieldErrors?.email} />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            재설정 링크 받기
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
