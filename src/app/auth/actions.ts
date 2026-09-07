"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { z } from "zod";

import { authErrorMessage, signInErrorMessage } from "@/lib/auth-errors";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  notice?: string;
  /** 필드별 오류. 키는 폼 input의 name과 같다. */
  fieldErrors?: Record<string, string>;
};

const email = z.email("올바른 이메일 주소를 입력하세요.").max(254);

const password = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .max(72, "비밀번호는 72자를 넘을 수 없습니다.")
  .refine(
    (value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value),
    "영문과 숫자를 모두 포함해야 합니다.",
  );

const signUpSchema = z.object({
  email,
  password,
  displayName: z.string().trim().max(50, "이름은 50자 이하로 입력하세요."),
  next: z.string().optional(),
});

const signInSchema = z.object({
  email,
  // 로그인에서는 형식 검증을 느슨하게 둔다. 정책 변경 전에 만든 계정도 들어와야 한다.
  password: z.string().min(1, "비밀번호를 입력하세요.").max(72),
  next: z.string().optional(),
});

function flatten(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName") ?? "",
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: flatten(parsed.error) };
  }

  const destination = safeRedirectPath(parsed.data.next ?? null);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // 확인 메일의 링크가 돌아올 주소. 환경변수 기반이라 호스트 헤더로 조작할 수 없다.
      emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=${encodeURIComponent(destination)}`,
      data: parsed.data.displayName
        ? { display_name: parsed.data.displayName }
        : undefined,
    },
  });

  if (error) {
    return { error: authErrorMessage(error) };
  }

  // 이메일 확인이 켜져 있으면 세션 없이 돌아온다. 이때 계정 존재 여부를 알려주지 않는다.
  if (!data.session) {
    return {
      notice:
        "확인 메일을 보냈습니다. 메일함에서 링크를 눌러 가입을 완료해 주세요.",
    };
  }

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: flatten(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: signInErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  redirect(safeRedirectPath(parsed.data.next ?? null));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
