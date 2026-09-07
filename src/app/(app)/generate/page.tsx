import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { QrStudio, type QrStudioInitial } from "@/components/qr/qr-studio";
import {
  DEFAULT_OPTIONS,
  qrFieldsSchema,
  qrOptionsSchema,
} from "@/lib/qr/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "QR 만들기" };

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function GeneratePage({
  searchParams,
}: PageProps<"/generate">) {
  const params = await searchParams;
  const loadId =
    typeof params.load === "string" && UUID.test(params.load)
      ? params.load
      : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let initial: QrStudioInitial | null = null;

  if (loadId) {
    const { data } = await supabase
      .from("qr_codes")
      .select("label, fields, options, logo_path")
      .eq("id", loadId)
      .eq("user_id", user.id)
      .maybeSingle();

    // DB에 저장된 JSON도 신뢰하지 않고 스키마로 다시 검증한다.
    const parsedFields = data ? qrFieldsSchema.safeParse(data.fields) : null;

    if (data && parsedFields?.success) {
      const parsedOptions = qrOptionsSchema.safeParse(data.options);

      let logoUrl: string | null = null;
      if (data.logo_path) {
        // 비공개 버킷이므로 짧게 유효한 서명 URL을 만들어 넘긴다.
        const { data: signed } = await supabase.storage
          .from("qr-logos")
          .createSignedUrl(data.logo_path, 600);
        logoUrl = signed?.signedUrl ?? null;
      }

      initial = {
        label: data.label,
        fields: parsedFields.data,
        options: parsedOptions.success ? parsedOptions.data : DEFAULT_OPTIONS,
        logoPath: data.logo_path,
        logoUrl,
      };
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">QR 코드 만들기</h1>
        <p className="text-sm text-muted-foreground">
          {initial
            ? "저장된 설정을 불러왔습니다. 수정 후 다시 저장하면 새 기록으로 남습니다."
            : "종류를 고르고 내용을 입력하면 바로 미리보기가 나타납니다."}
        </p>
      </div>

      <QrStudio userId={user.id} initial={initial} />
    </div>
  );
}
