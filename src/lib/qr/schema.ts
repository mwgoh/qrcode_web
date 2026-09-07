import { z } from "zod";

export const QR_KINDS = [
  "url",
  "text",
  "email",
  "phone",
  "sms",
  "wifi",
  "vcard",
] as const;

export type QrKind = (typeof QR_KINDS)[number];

export const QR_KIND_LABELS: Record<QrKind, string> = {
  url: "웹사이트",
  text: "텍스트",
  email: "이메일",
  phone: "전화",
  sms: "문자",
  wifi: "Wi-Fi",
  vcard: "연락처",
};

/** QR 심볼 하나에 안전하게 담을 수 있는 실질적 상한. */
export const MAX_CONTENT_LENGTH = 1800;

const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "‘#1DA1F2’ 형식이어야 합니다.");

const phone = z
  .string()
  .trim()
  .min(1, "전화번호를 입력하세요.")
  .max(32, "전화번호가 너무 깁니다.")
  .regex(/^[0-9+\-().\s]+$/, "숫자와 + - ( ) . 공백만 사용할 수 있습니다.");

const shortText = (max: number) => z.string().trim().max(max);

export const qrFieldsSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("url"),
    url: z
      .url("http:// 또는 https:// 로 시작하는 주소를 입력하세요.")
      .max(1200)
      .refine(
        (value) => /^https?:\/\//i.test(value),
        "http 또는 https 주소만 지원합니다.",
      ),
  }),
  z.object({
    kind: z.literal("text"),
    text: z
      .string()
      .trim()
      .min(1, "내용을 입력하세요.")
      .max(MAX_CONTENT_LENGTH, "내용이 너무 깁니다."),
  }),
  z.object({
    kind: z.literal("email"),
    to: z.email("올바른 이메일 주소를 입력하세요.").max(254),
    subject: shortText(160),
    body: shortText(800),
  }),
  z.object({
    kind: z.literal("phone"),
    phone,
  }),
  z.object({
    kind: z.literal("sms"),
    phone,
    message: shortText(500),
  }),
  z.object({
    kind: z.literal("wifi"),
    ssid: z.string().trim().min(1, "네트워크 이름을 입력하세요.").max(64),
    password: shortText(96),
    encryption: z.enum(["WPA", "WEP", "nopass"]),
    hidden: z.boolean(),
  }),
  z.object({
    kind: z.literal("vcard"),
    firstName: shortText(64),
    lastName: shortText(64),
    organization: shortText(96),
    title: shortText(96),
    phone: z.union([phone, z.literal("")]),
    email: z.union([
      z.email("올바른 이메일 주소를 입력하세요.").max(254),
      z.literal(""),
    ]),
    url: z.union([z.url("올바른 주소를 입력하세요.").max(600), z.literal("")]),
  }),
]);

export type QrFields = z.infer<typeof qrFieldsSchema>;

export const qrOptionsSchema = z.object({
  size: z.number().int().min(128).max(1600),
  margin: z.number().int().min(0).max(10),
  darkColor: hexColor,
  lightColor: hexColor,
  errorCorrectionLevel: z.enum(["L", "M", "Q", "H"]),
  /** 로고가 QR 한 변에서 차지하는 비율. 0.3을 넘기면 스캔 실패율이 급격히 오른다. */
  logoScale: z.number().min(0.1).max(0.3),
});

export type QrOptions = z.infer<typeof qrOptionsSchema>;

export const DEFAULT_OPTIONS: QrOptions = {
  size: 512,
  margin: 2,
  darkColor: "#0F1419",
  lightColor: "#FFFFFF",
  errorCorrectionLevel: "M",
  logoScale: 0.22,
};

export const DEFAULT_FIELDS: Record<QrKind, QrFields> = {
  url: { kind: "url", url: "https://" },
  text: { kind: "text", text: "" },
  email: { kind: "email", to: "", subject: "", body: "" },
  phone: { kind: "phone", phone: "" },
  sms: { kind: "sms", phone: "", message: "" },
  wifi: {
    kind: "wifi",
    ssid: "",
    password: "",
    encryption: "WPA",
    hidden: false,
  },
  vcard: {
    kind: "vcard",
    firstName: "",
    lastName: "",
    organization: "",
    title: "",
    phone: "",
    email: "",
    url: "",
  },
};

const BACKSLASH = String.fromCharCode(92);

/** Wi-Fi 페이로드에서 구분자로 쓰이는 \ ; , : " 를 이스케이프한다. */
function escapeWifi(value: string) {
  return value.replace(/[\\;,:"]/g, (match) => BACKSLASH + match);
}

/** vCard 3.0 텍스트 값 이스케이프 (RFC 2426). */
function escapeVCard(value: string) {
  return value
    .replace(/[\\;,]/g, (match) => BACKSLASH + match)
    .replace(/\r?\n/g, BACKSLASH + "n");
}

/** 폼 입력을 실제로 QR에 인코딩할 문자열로 변환한다. */
export function buildPayload(fields: QrFields): string {
  switch (fields.kind) {
    case "url":
      return fields.url.trim();

    case "text":
      return fields.text;

    case "email": {
      const params = new URLSearchParams();
      if (fields.subject) params.set("subject", fields.subject);
      if (fields.body) params.set("body", fields.body);
      const query = params.toString();
      return `mailto:${fields.to}${query ? `?${query}` : ""}`;
    }

    case "phone":
      return `tel:${fields.phone.replace(/\s/g, "")}`;

    case "sms": {
      const number = fields.phone.replace(/\s/g, "");
      return fields.message
        ? `SMSTO:${number}:${fields.message}`
        : `SMSTO:${number}`;
    }

    case "wifi": {
      const parts = [`T:${fields.encryption}`, `S:${escapeWifi(fields.ssid)}`];
      if (fields.encryption !== "nopass" && fields.password) {
        parts.push(`P:${escapeWifi(fields.password)}`);
      }
      if (fields.hidden) parts.push("H:true");
      return `WIFI:${parts.join(";")};;`;
    }

    case "vcard": {
      const fullName = `${fields.firstName} ${fields.lastName}`.trim();
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escapeVCard(fields.lastName)};${escapeVCard(fields.firstName)};;;`,
        `FN:${escapeVCard(fullName)}`,
      ];
      if (fields.organization) {
        lines.push(`ORG:${escapeVCard(fields.organization)}`);
      }
      if (fields.title) lines.push(`TITLE:${escapeVCard(fields.title)}`);
      if (fields.phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(fields.phone)}`);
      if (fields.email) lines.push(`EMAIL:${escapeVCard(fields.email)}`);
      if (fields.url) lines.push(`URL:${escapeVCard(fields.url)}`);
      lines.push("END:VCARD");
      return lines.join("\n");
    }
  }
}

/** 저장 요청 검증에 쓰는 스키마. 서버 액션은 이 결과만 신뢰한다. */
export const saveQrSchema = z.object({
  label: z.string().trim().max(80, "이름은 80자 이하로 입력하세요."),
  fields: qrFieldsSchema,
  options: qrOptionsSchema,
  logoPath: z
    .string()
    .max(300)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
});

export type SaveQrInput = z.infer<typeof saveQrSchema>;
