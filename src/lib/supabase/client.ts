import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/types/database";

import { supabaseEnv } from "./env";

/** 브라우저(클라이언트 컴포넌트) 전용 Supabase 클라이언트. */
export function createClient() {
  const { url, publishableKey } = supabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
