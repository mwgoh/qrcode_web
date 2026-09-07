/**
 * 오픈 리다이렉트 방지.
 *
 * `?next=` 같은 사용자 제어 값을 그대로 redirect()에 넘기면 공격자가
 * `//evil.com` 이나 `https://evil.com` 으로 유도할 수 있다. 앱 내부 경로만 통과시킨다.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/generate",
): string {
  if (!value) return fallback;
  // 반드시 "/"로 시작하고, 프로토콜 상대 경로("//host")나 백슬래시 변형이 아니어야 한다.
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
