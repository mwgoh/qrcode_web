import { NextResponse, type NextRequest } from "next/server";

import type { EmailOtpType } from "@supabase/supabase-js";

import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

/** 링크로 들어올 수 있는 OTP 타입 허용 목록. 쿼리 값을 그대로 캐스팅하지 않는다. */
const ALLOWED_TYPES = new Set<EmailOtpType>([
  "signup",
  "email",
  "recovery",
  "invite",
  "email_change",
  "magiclink",
]);

/**
 * 확인 메일 링크가 돌아오는 지점.
 *
 * 메일 템플릿에 따라 링크가 두 가지 형태로 들어오므로 둘 다 받는다.
 *
 *  - `?code=...`             Supabase 기본 템플릿(`{{ .ConfirmationURL }}`). GoTrue가 먼저
 *                            토큰을 검증한 뒤 PKCE 인가 코드를 붙여 되돌려 보낸다.
 *                            가입을 시작한 브라우저에 코드 검증자 쿠키가 있어야 한다.
 *  - `?token_hash=&type=`    템플릿을 `{{ .TokenHash }}` 형태로 바꿨을 때. 쿠키가 필요 없어
 *                            다른 기기에서 링크를 열어도 확인된다.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  const type = ALLOWED_TYPES.has(rawType as EmailOtpType)
    ? (rawType as EmailOtpType)
    : null;

  const done = new URL(next, request.nextUrl.origin);

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) return NextResponse.redirect(done);
  } else if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) return NextResponse.redirect(done);
  }

  return NextResponse.redirect(
    new URL("/login?error=confirm", request.nextUrl.origin),
  );
}
