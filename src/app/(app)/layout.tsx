import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: LayoutProps<"/">) {
  // 미들웨어가 1차 방어선이지만, 레이아웃에서도 다시 확인해 우회 경로를 남기지 않는다.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </>
  );
}
