import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16의 proxy(구 middleware) 진입점.
 * 모든 요청에서 Supabase 세션을 갱신하고 보호 경로 접근을 검사한다.
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 정적 자산과 이미지 최적화 요청을 제외한 모든 경로에서 세션을 갱신한다.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
