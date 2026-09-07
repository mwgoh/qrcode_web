import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@supabase/ssr";

import { supabaseEnv } from "./env";

/** 로그인해야 접근 가능한 경로 프리픽스. */
const PROTECTED_PREFIXES = ["/generate", "/history", "/account"];

/** 이미 로그인한 사용자는 다시 볼 필요 없는 경로. */
const AUTH_ONLY_PREFIXES = ["/login", "/signup"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * 매 요청마다 Supabase 세션 쿠키를 갱신하고, 경로 접근 권한을 확인한다.
 *
 * 미들웨어에서 토큰을 갱신하지 않으면 서버 컴포넌트는 쿠키를 쓸 수 없기 때문에
 * 액세스 토큰이 만료된 뒤 임의로 로그아웃되는 현상이 생긴다.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, publishableKey } = supabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // 인증 쿠키가 실린 응답은 CDN이 캐시하면 안 된다(세션 유출). 라이브러리가
        // 건네주는 no-store 계열 헤더를 그대로 응답에 복사한다.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // getUser()는 Auth 서버에 토큰을 검증시킨다. 이 호출을 지우면 세션이 갱신되지 않는다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && matches(pathname, PROTECTED_PREFIXES)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && matches(pathname, AUTH_ONLY_PREFIXES)) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = "/generate";
    appUrl.search = "";
    return NextResponse.redirect(appUrl);
  }

  return response;
}
