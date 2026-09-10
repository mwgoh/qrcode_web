"use client";

import * as React from "react";
import Link from "next/link";

import { Loader2 } from "lucide-react";

import {
  updatePasswordAction,
  type AuthFormState,
} from "@/app/auth/actions";
import { FieldError, FormFeedback } from "@/components/auth/auth-feedback";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const INITIAL: AuthFormState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = React.useActionState(
    updatePasswordAction,
    INITIAL,
  );

  // 변경에 성공하면 링크로 만들어진 세션이 그대로 유효하다. 폼을 닫고 앱으로 갈 길만 남긴다.
  if (state.notice) {
    return (
      <div className="space-y-4">
        <FormFeedback notice={state.notice} />
        <Link
          href="/generate"
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          QR 만들기로 이동
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormFeedback error={state.error} />

      <div className="space-y-1.5">
        <Label htmlFor="password">새 비밀번호</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="영문·숫자 포함 8자 이상"
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        <FieldError message={state.fieldErrors?.password} />
        {state.fieldErrors?.password ? null : (
          <p className="text-xs text-muted-foreground">
            영문과 숫자를 포함해 8자 이상으로 만들어 주세요.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="passwordConfirm">새 비밀번호 확인</Label>
        <Input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          aria-invalid={Boolean(state.fieldErrors?.passwordConfirm)}
        />
        <FieldError message={state.fieldErrors?.passwordConfirm} />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : null}
        비밀번호 변경
      </Button>
    </form>
  );
}
