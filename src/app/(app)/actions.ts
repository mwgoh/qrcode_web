"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import {
  QR_KIND_LABELS,
  QR_QUOTA,
  buildPayload,
  saveQrSchema,
} from "@/lib/qr/schema";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const idSchema = z.uuid("잘못된 요청입니다.");

/** 라벨을 비워두면 종류 + 날짜로 기본 이름을 만든다. */
function defaultLabel(kind: keyof typeof QR_KIND_LABELS) {
  const stamp = new Date().toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  });
  return `${QR_KIND_LABELS[kind]} ${stamp}`;
}

export async function saveQrCodeAction(input: unknown): Promise<ActionResult> {
  const parsed = saveQrSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { label, fields, options, logoPath } = parsed.data;

  // 페이로드는 클라이언트가 보낸 문자열이 아니라 서버에서 다시 만든다.
  const content = buildPayload(fields);
  if (content.length === 0 || content.length > 2048) {
    return { ok: false, error: "QR에 담을 내용의 길이가 올바르지 않습니다." };
  }

  // 스토리지 경로는 반드시 본인 폴더 아래여야 한다(RLS와 이중 방어).
  if (logoPath && !logoPath.startsWith(`${user.id}/`)) {
    return { ok: false, error: "로고 경로가 올바르지 않습니다." };
  }

  const { data, error } = await supabase
    .from("qr_codes")
    .insert({
      user_id: user.id,
      label: label || defaultLabel(fields.kind),
      kind: fields.kind,
      content,
      fields: fields as unknown as Json,
      options: options as unknown as Json,
      logo_path: logoPath,
    })
    .select("id")
    .single();

  if (error || !data) {
    // 할당량 초과는 트리거가 check_violation(23514)으로 던진다. 예외 문구를 그대로
    // 비교하면 문구를 손보는 순간 조용히 깨지므로, 코드로 거른 뒤 실제로 상한에
    // 닿았는지 세어 확인한다(다른 check 제약도 같은 코드로 오기 때문).
    if (error?.code === "23514") {
      const { count } = await supabase
        .from("qr_codes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if ((count ?? 0) >= QR_QUOTA) {
        return {
          ok: false,
          error: `저장할 수 있는 QR 코드는 최대 ${QR_QUOTA}개입니다.`,
        };
      }
    }

    return {
      ok: false,
      error: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  revalidatePath("/history");
  return { ok: true, id: data.id };
}

export async function deleteQrCodeAction(rawId: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(rawId);
  if (!parsedId.success) return { ok: false, error: "잘못된 요청입니다." };
  const id = parsedId.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // RLS가 남의 행을 막지만, user_id 조건을 명시해 의도를 분명히 한다.
  const { data: row } = await supabase
    .from("qr_codes")
    .select("logo_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("qr_codes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "삭제하지 못했습니다." };
  }

  // 같은 로고를 쓰는 다른 기록이 없을 때만 스토리지에서도 지운다.
  if (row?.logo_path) {
    const { count } = await supabase
      .from("qr_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("logo_path", row.logo_path);

    if (!count) {
      await supabase.storage.from("qr-logos").remove([row.logo_path]);
    }
  }

  revalidatePath("/history");
  return { ok: true, id };
}

export async function renameQrCodeAction(
  rawId: string,
  rawLabel: string,
): Promise<ActionResult> {
  const parsed = z
    .object({ id: idSchema, label: z.string().trim().max(80) })
    .safeParse({ id: rawId, label: rawLabel });

  if (!parsed.success) {
    return { ok: false, error: "이름은 80자 이하로 입력하세요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("qr_codes")
    .update({ label: parsed.data.label })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "이름을 바꾸지 못했습니다." };

  revalidatePath("/history");
  return { ok: true, id: parsed.data.id };
}
