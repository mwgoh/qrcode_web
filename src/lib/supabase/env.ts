/**
 * Supabase 환경변수 접근 지점.
 *
 * 보안: 여기서는 브라우저에 노출돼도 안전한 값(프로젝트 URL, publishable/anon 키)만 다룬다.
 * `service_role` / `sb_secret_...` 키는 RLS를 통째로 우회하므로 이 파일은 물론
 * 클라이언트 번들에 닿는 어떤 경로에서도 절대 참조하지 않는다.
 */

// process.env.NEXT_PUBLIC_* 는 빌드 시 리터럴로 치환되므로 반드시 직접 참조해야 한다.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function assertConfigured(
  value: string | undefined,
  name: string,
): asserts value is string {
  if (!value) {
    throw new Error(
      `${name} 환경변수가 설정되지 않았습니다. .env.local 또는 Vercel 프로젝트 환경변수를 확인하세요.`,
    );
  }
}

export function supabaseEnv() {
  assertConfigured(url, "NEXT_PUBLIC_SUPABASE_URL");
  assertConfigured(
    publishableKey,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (또는 NEXT_PUBLIC_SUPABASE_ANON_KEY)",
  );
  return { url, publishableKey };
}
