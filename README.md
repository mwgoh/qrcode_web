# QR 코드 생성기

Next.js 16 (App Router) + Supabase Auth + shadcn/ui(tweakcn `twitter` 테마)로 만든
QR 코드 생성기입니다. 회원가입·로그인·로그아웃과 사용자별 생성 기록 보관을 지원합니다.

## 기능

- **7가지 QR 종류** — 웹사이트, 텍스트, 이메일, 전화, 문자, Wi-Fi, 연락처(vCard)
- **디자인 커스터마이징** — 전경/배경색, 크기, 여백, 오류 보정 수준(L/M/Q/H), 가운데 로고
- **PNG · SVG 내려받기**
- **계정 인증** — 이메일/비밀번호 회원가입, 로그인, 로그아웃 (Supabase Auth)
- **비밀번호 재설정** — 로그인 화면에서 메일로 링크를 받아 새 비밀번호 설정
- **내 기록** — 저장·이름 변경·삭제, 저장된 설정 그대로 다시 불러와 편집

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프레임워크 | Next.js 16 (App Router, Server Actions, `proxy.ts`) |
| 스타일 | Tailwind CSS v4, shadcn/ui, tweakcn `twitter` 테마 |
| 인증·DB·스토리지 | Supabase (Auth / Postgres + RLS / Storage) |
| QR 생성 | `qrcode` (브라우저 Canvas·SVG 렌더링) |
| 검증 | Zod v4 (클라이언트·서버 양쪽) |

## 시작하기

### 1. 환경변수

`.env.example`을 `.env.local`로 복사하고 값을 채웁니다.

```bash
cp .env.example .env.local
```

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable 키 (구 프로젝트는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `NEXT_PUBLIC_SITE_URL` | 확인 메일 링크가 돌아올 주소 |

> `service_role` / `sb_secret_...` 키는 이 앱에서 쓰지 않습니다. 절대 넣지 마세요.

### 2. 데이터베이스 스키마 적용

[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)을 적용합니다.
Supabase MCP 서버, Supabase CLI, 또는 대시보드의 SQL Editor 중 편한 방법을 쓰면 됩니다.

만들어지는 것:

- `public.profiles` — `auth.users` 1:1 확장, 가입 시 트리거로 자동 생성
- `public.qr_codes` — 사용자별 QR 기록 (계정당 최대 300개)
- `storage.buckets`의 `qr-logos` — 비공개 로고 버킷 (512KB, PNG/JPG/WebP)
- 위 세 곳 모두에 대한 RLS 정책 (본인 행/본인 폴더만 접근)

### 3. Supabase Auth 설정

대시보드 → Authentication → URL Configuration에서

- **Site URL**: 배포 도메인 (로컬 개발 시 `http://localhost:3000`)
- **Redirect URLs**: `http://localhost:3000/**` (배포 후 `https://<도메인>/**` 추가)

확인 메일 링크는 `/auth/confirm?next=...` 처럼 쿼리 문자열을 달고 돌아옵니다. allow list는
URL 전체를 glob으로 맞추기 때문에 `.../auth/confirm`만 넣으면 매칭되지 않습니다. 경로 전체를
덮는 `/**`를 쓰세요.

메일 템플릿은 기본값(`{{ .ConfirmationURL }}`) 그대로 두면 됩니다. 이때는 PKCE 인가 코드가
`?code=`로 돌아오므로 가입을 시작한 브라우저에서 링크를 열어야 합니다. 다른 기기에서 열어도
확인되게 하려면 Authentication → Email Templates의 Confirm signup을 아래처럼 바꿉니다.
[`/auth/confirm`](src/app/auth/confirm/route.ts) 라우트는 두 형태를 모두 처리합니다.

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Confirm email address</a>
```

비밀번호 재설정 메일은 Authentication → Email Templates의 **Reset Password**를 아래처럼
바꿉니다.

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">비밀번호 재설정</a>
```

여기서 `{{ .RedirectTo }}` 대신 `{{ .SiteURL }}`에 경로를 직접 붙이는 이유가 있습니다.
코드가 넘긴 redirect_to 값이 Redirect URLs allow list에 걸리면 `{{ .RedirectTo }}`는
**빈 문자열로 렌더**되고, 그러면 링크가 `&token_hash=...` 같은 호스트 없는 상대 URL이 되어
메일 앱에서 열리지 않습니다. `{{ .SiteURL }}`은 대시보드 설정값이라 항상 채워집니다.

> **링크는 메일을 연 기기에서 열립니다.** `NEXT_PUBLIC_SITE_URL`이 `localhost:3000`인 동안에는
> 개발 PC에서만 열립니다. 휴대폰에서 누르면 그 휴대폰의 localhost를 찾아 반드시 실패합니다.
> 휴대폰으로 테스트하려면 PC의 LAN 주소(예: `http://192.168.0.10:3000`)를
> `NEXT_PUBLIC_SITE_URL`·Site URL·Redirect URLs 세 곳에 넣고 `npm run dev -- -H 0.0.0.0`으로
> 띄우거나, Vercel 배포본에서 하세요.
>
> 재설정 링크를 확인하면 Supabase가 **정식 세션을 만들어 줍니다.** 링크를 가진 사람은 곧
> 계정에 들어올 수 있다는 뜻이므로, 유효시간(Authentication → Email, 기본 1시간)을 필요
> 이상으로 늘리지 마세요.

### 4. 개발 서버

```bash
npm install
npm run dev
```

## Vercel 배포

### 1. 저장소 import

GitHub에 푸시하고 Vercel에서 저장소를 import 합니다.

### 2. Environment Variables 등록

[위 환경변수 3개](#1-환경변수)를 Production·Preview 양쪽에 넣습니다. `NEXT_PUBLIC_SITE_URL`만
배포 도메인(예: `https://qrcode-web.vercel.app`)으로 바꿉니다.

> `NEXT_PUBLIC_*` 값은 **빌드 시점에 번들로 박힙니다.** 값을 바꾸면 재배포해야 반영됩니다.
> 특히 [`next.config.ts`](next.config.ts)의 CSP는 `NEXT_PUBLIC_SUPABASE_URL`로 만들어지므로,
> 빌드 시점에 이 값이 없으면 `https://*.supabase.co` 와일드카드로 느슨해집니다.

### 3. Supabase Auth URL 갱신 (배포 도메인이 정해진 뒤)

Authentication → URL Configuration에서

- **Site URL**: `https://<배포 도메인>`
- **Redirect URLs**: `https://<배포 도메인>/**` 추가 (로컬용 `http://localhost:3000/**` 는 유지)
- 프리뷰 배포에서도 로그인을 테스트하려면 `https://*-<팀 또는 계정 슬러그>.vercel.app/**` 도 추가

### 4. 확인 메일용 SMTP (실서비스라면 필수)

Supabase 기본 SMTP는 **시간당 2건**만 보냅니다. 한도에 걸리면 가입이
`over_email_send_rate_limit`으로 실패합니다. Authentication → Emails에서 커스텀 SMTP를
연결하고 Rate Limits도 함께 올리세요.

Node 버전은 [`package.json`](package.json)의 `engines`로 `22.x`에 고정돼 있습니다.
그 밖의 빌드 설정은 기본값 그대로 동작합니다.

## 보안 설계

이 앱은 브라우저에 노출되는 publishable 키만 사용합니다. 실제 접근 통제는 전적으로
데이터베이스의 RLS 정책이 담당하며, 애플리케이션 코드는 그 위에 방어선을 하나 더 둡니다.

- **세션 검증** — 서버에서는 쿠키를 그대로 믿는 `getSession()` 대신 항상 `getUser()`를
  써서 Auth 서버에 토큰을 검증시킵니다 ([`src/lib/supabase/server.ts`](src/lib/supabase/server.ts)).
- **이중 접근 통제** — `proxy.ts`가 보호 경로를 1차로 막고, `(app)` 레이아웃과 각
  서버 액션이 다시 사용자 확인 후 `user_id` 조건을 명시합니다.
- **RLS** — 모든 사용자 테이블에 RLS를 켜고 `auth.uid()` 기준 본인 행만 허용합니다.
  `security definer` 함수는 `search_path`를 비워 스키마 하이재킹을 막습니다.
- **스토리지 격리** — 로고는 비공개 버킷의 `<user_id>/...` 경로에만 올라가며,
  읽기는 짧은 수명의 서명 URL로만 가능합니다.
- **오픈 리다이렉트 차단** — `?next=` 값은 [`safeRedirectPath`](src/lib/safe-redirect.ts)로
  앱 내부 경로만 통과시킵니다.
- **호스트 헤더 인젝션 차단** — 확인 메일 링크는 요청 Host가 아니라 환경변수 기반으로 만듭니다.
- **입력 검증** — Zod 스키마로 클라이언트와 서버 양쪽에서 검증하고, QR 페이로드는
  클라이언트가 보낸 문자열이 아니라 서버가 다시 조립합니다.
- **계정 열거 방지** — 로그인 실패 시 원인을 구분해 알려주지 않습니다.
- **보안 헤더** — CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy,
  Permissions-Policy를 [`next.config.ts`](next.config.ts)에서 전 경로에 적용합니다.
- **자원 남용 방지** — 계정당 QR 300개, 로고 512KB, JSON 컬럼 크기 상한을 DB 제약으로 강제합니다.

### 추가로 권장하는 설정

- Supabase Authentication → Providers → Email에서 **Confirm email**을 켜 두세요.
- Auth의 비밀번호 최소 길이를 앱 검증과 같은 8자로 맞춰 두세요.
- 유출 비밀번호 검사(HaveIBeenPwned)도 켜면 이중으로 걸러지지만, 이 기능은 유료 플랜
  전용입니다. Free 플랜에서는 설정이 402로 거부됩니다.
- 프로덕션에서는 Auth Rate Limits를 기본값 이하로 조여 두는 것을 권합니다.

## 프로젝트 구조

```
src/
├─ app/
│  ├─ (auth)/            로그인·회원가입·비밀번호 재설정
│  ├─ (app)/             생성·기록 (로그인 필수) + QR 서버 액션
│  ├─ auth/              인증 서버 액션, 메일 링크 확인 라우트
│  ├─ layout.tsx         폰트·테마·토스트
│  ├─ page.tsx           랜딩
│  ├─ not-found.tsx      404
│  ├─ error.tsx          예외 경계
│  └─ global-error.tsx   루트 레이아웃이 무너졌을 때
├─ components/
│  ├─ auth/              로그인·회원가입·재설정 폼
│  ├─ qr/                QR 스튜디오, 기록 목록
│  └─ ui/                shadcn/ui 컴포넌트
├─ lib/
│  ├─ qr/                검증 스키마, 페이로드 생성, 렌더링
│  ├─ supabase/          브라우저·서버·proxy 클라이언트
│  └─ safe-redirect.ts, site-url.ts
└─ proxy.ts              세션 갱신 + 경로 보호
```

## 스크립트

```bash
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드
npm run start   # 빌드 결과 실행
npm run lint    # ESLint
```
