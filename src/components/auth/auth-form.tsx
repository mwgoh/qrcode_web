"use client";

import * as React from "react";
import Link from "next/link";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import {
  signInAction,
  signUpAction,
  type AuthFormState,
} from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "signup";

const INITIAL: AuthFormState = {};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const isSignup = mode === "signup";
  const [state, formAction, pending] = React.useActionState(
    isSignup ? signUpAction : signInAction,
    INITIAL,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{state.error}</span>
        </div>
      ) : null}

      {state.notice ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-foreground"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>{state.notice}</span>
        </div>
      ) : null}

      {isSignup ? (
        <div className="space-y-1.5">
          <Label htmlFor="displayName">이름 (선택)</Label>
          <Input
            id="displayName"
            name="displayName"
            autoComplete="name"
            maxLength={50}
            placeholder="홍길동"
          />
          <FieldError message={state.fieldErrors?.displayName} />
        </div>
      ) : null}

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

      <div className="space-y-1.5">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={isSignup ? "new-password" : "current-password"}
          placeholder={isSignup ? "영문·숫자 포함 8자 이상" : "••••••••"}
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        <FieldError message={state.fieldErrors?.password} />
        {isSignup && !state.fieldErrors?.password ? (
          <p className="text-xs text-muted-foreground">
            영문과 숫자를 포함해 8자 이상으로 만들어 주세요.
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : null}
        {isSignup ? "회원가입" : "로그인"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isSignup ? (
          <>
            이미 계정이 있으신가요?{" "}
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              로그인
            </Link>
          </>
        ) : (
          <>
            아직 계정이 없으신가요?{" "}
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              회원가입
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
