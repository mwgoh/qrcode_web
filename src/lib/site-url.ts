/**
 * 이메일 확인 링크 등 절대 URL이 필요한 곳에서 쓰는 사이트 주소.
 *
 * 보안: 요청의 Host 헤더를 신뢰하면 호스트 헤더 인젝션으로 확인 링크를 공격자
 * 도메인으로 돌릴 수 있다. 그래서 환경변수를 우선하고, 마지막에만 로컬 기본값을 쓴다.
 */
export function getSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);

  const raw = configured ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
