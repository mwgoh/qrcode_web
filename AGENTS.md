# QR 코드 생성기 — 작업 규칙

Next.js 16 (App Router) + Supabase. 기능·설치·배포는 [README.md](README.md)에 있고,
이 문서는 **코드를 고칠 때 지켜야 할 규칙**만 담습니다.

## 보안

브라우저에 노출되는 publishable 키만 쓰므로 접근 통제는 전적으로 DB의 RLS가 담당합니다.
아래가 깨지면 곧바로 취약점입니다.

- 서버 세션 검증은 항상 `getUser()`. 쿠키를 믿는 `getSession()`은 쓰지 않습니다.
- `service_role` / `sb_secret_...` 키는 어떤 경로로도 코드에 넣지 않습니다(RLS 우회).
- 새 테이블은 RLS + `auth.uid()` 정책 필수. UPDATE는 `using`·`with check` 둘 다
  씁니다(`with check`가 없으면 행의 소유자를 남의 것으로 바꿀 수 있음).
- `security definer` 함수는 `set search_path = ''`. 트리거 전용 함수는
  `revoke execute ... from public, anon, authenticated, service_role`까지 합니다
  (트리거 발화에는 EXECUTE가 필요 없어 회수해도 정상 동작).
- 리다이렉트는 `safeRedirectPath()`, 절대 URL은 `getSiteUrl()`을 거칩니다
  (오픈 리다이렉트·Host 헤더 인젝션 방지).
- QR 페이로드는 클라이언트 문자열을 그대로 저장하지 않고 서버에서 다시 조립합니다.

## 사용자에게 보이는 문구

- 화면에 나가는 메시지는 **전부 한국어**로 씁니다.
- **Supabase나 라이브러리의 영문 오류를 그대로 노출하지 않습니다.** 인증 오류는
  [`src/lib/auth-errors.ts`](src/lib/auth-errors.ts), QR 렌더링 오류는
  [`src/lib/qr/render.ts`](src/lib/qr/render.ts)의 매핑을 거칩니다. 코드를 추가할 때는
  `@supabase/auth-js`의 `ErrorCode` 목록에서 정확한 이름을 확인하고 씁니다.
- **로그인·비밀번호 재설정 실패는 원인을 구분해 알려주지 않습니다.** 원인을 밝히면
  계정 존재 여부가 새어 나갑니다(계정 열거). 계정과 무관한 요청 한도 초과만 예외로 둡니다.

## 데이터베이스

- 스키마 변경은 [`supabase/migrations/`](supabase/migrations/)에 반영합니다.
- 마이그레이션은 **멱등하게** 씁니다(`if not exists`, `on conflict do nothing`).
- 변경 후에는 보안 어드바이저를 돌려 경고 0건을 확인합니다.

## 검증

고친 뒤 `npm run lint`와 `npm run build`를 통과시킵니다.

---

아래 블록은 `next dev`가 자동으로 관리합니다. 한국어로 바꿔도 다음 실행 때 영어 원문으로
되돌아가므로 그대로 둡니다. 마커 **바깥**의 내용은 보존됩니다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
