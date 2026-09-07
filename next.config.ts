import type { NextConfig } from "next";

// Supabase 프로젝트 오리진만 CSP에 열어 준다. 값이 없으면(로컬 초기 설정 등)
// 와일드카드로 두되, 배포 환경에서는 반드시 환경변수를 채워야 한다.
const supabaseOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return "https://*.supabase.co";
  try {
    return new URL(raw).origin;
  } catch {
    return "https://*.supabase.co";
  }
})();

const csp = [
  "default-src 'self'",
  // Next.js는 하이드레이션 부트스트랩을 인라인 스크립트로 넣기 때문에 nonce 없이는
  // 'unsafe-inline'이 필요하다. 대신 외부 스크립트 출처는 self로 잠근다.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: " + supabaseOrigin,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace("https://", "wss://")}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // 상위 디렉터리의 무관한 lock 파일을 프로젝트 루트로 오인하지 않도록 고정한다.
  turbopack: { root: __dirname },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
