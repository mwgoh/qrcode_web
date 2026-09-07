import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/types/database";

import { supabaseEnv } from "./env";

/**
 * 서버 컴포넌트 / 서버 액션 / 라우트 핸들러용 Supabase 클라이언트.
 *
 * 요청마다 새로 만들어야 한다. 클라이언트를 요청 간에 재사용하면 다른 사용자의
 * 세션 쿠키가 섞일 수 있다.
 */
export async function createClient() {
  const { url, publishableKey } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없다. 토큰 갱신은 미들웨어가 담당하므로
          // 여기서는 무시해도 안전하다.
        }
      },
    },
  });
}

/**
 * 현재 로그인한 사용자를 반환한다.
 *
 * 보안: 쿠키에 들어있는 세션을 그대로 믿는 `getSession()` 대신 항상 `getUser()`를 쓴다.
 * `getUser()`는 Supabase Auth 서버에 토큰을 검증시키므로 위조된 쿠키를 걸러낸다.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
