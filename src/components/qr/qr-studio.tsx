"use client";

import * as React from "react";

import { Download, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { saveQrCodeAction } from "@/app/(app)/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  canvasToPngBlob,
  downloadBlob,
  drawQr,
  renderSvg,
  toFileSlug,
} from "@/lib/qr/render";
import {
  DEFAULT_FIELDS,
  DEFAULT_OPTIONS,
  QR_KINDS,
  QR_KIND_LABELS,
  buildPayload,
  qrFieldsSchema,
  type QrFields,
  type QrKind,
  type QrOptions,
} from "@/lib/qr/schema";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ECC_LEVELS = [
  { value: "L", label: "L · 7%" },
  { value: "M", label: "M · 15%" },
  { value: "Q", label: "Q · 25%" },
  { value: "H", label: "H · 30%" },
] as const;

const WIFI_ENCRYPTIONS = [
  { value: "WPA", label: "WPA/WPA2" },
  { value: "WEP", label: "WEP" },
  { value: "nopass", label: "없음" },
] as const;

const MAX_LOGO_BYTES = 512 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export type QrStudioInitial = {
  label: string;
  fields: QrFields;
  options: QrOptions;
  logoPath: string | null;
  logoUrl: string | null;
};

type SegmentedProps<T extends string> = {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
};

function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: SegmentedProps<T>) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={option.value === value ? "default" : "outline"}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="size-8 cursor-pointer rounded-lg border border-input bg-transparent p-0.5"
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          maxLength={7}
          className="font-mono uppercase"
        />
      </div>
    </div>
  );
}

export function QrStudio({
  userId,
  initial,
}: {
  userId: string;
  initial?: QrStudioInitial | null;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isSaving, startSaving] = React.useTransition();

  const [kind, setKind] = React.useState<QrKind>(
    initial?.fields.kind ?? "url",
  );
  const [fieldsByKind, setFieldsByKind] = React.useState<
    Record<QrKind, QrFields>
  >(() =>
    initial
      ? { ...DEFAULT_FIELDS, [initial.fields.kind]: initial.fields }
      : { ...DEFAULT_FIELDS },
  );
  const [options, setOptions] = React.useState<QrOptions>(
    initial?.options ?? DEFAULT_OPTIONS,
  );
  const [label, setLabel] = React.useState(initial?.label ?? "");

  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(
    initial?.logoUrl ?? null,
  );
  const [logoPath, setLogoPath] = React.useState<string | null>(
    initial?.logoPath ?? null,
  );

  const fields = fieldsByKind[kind];

  const patch = React.useCallback(
    (next: Partial<QrFields>) => {
      setFieldsByKind((prev) => ({
        ...prev,
        [kind]: { ...prev[kind], ...next } as QrFields,
      }));
    },
    [kind],
  );

  const validation = React.useMemo(
    () => qrFieldsSchema.safeParse(fields),
    [fields],
  );

  const payload = validation.success ? buildPayload(validation.data) : "";
  const validationMessage = validation.success
    ? null
    : validation.error.issues[0]?.message ?? "입력값을 확인해 주세요.";

  // 입력이 바뀔 때마다 캔버스를 다시 그린다.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !payload) return;

    let cancelled = false;
    void drawQr(canvas, { payload, options, logoSrc: logoPreview })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast.error(
          error instanceof Error ? error.message : "미리보기를 그리지 못했습니다.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [payload, options, logoPreview]);

  // 브라우저에서 만든 objectURL은 반드시 해제한다. 해제 시점은 미리보기 URL이 바뀔 때뿐이므로
  // logoFile을 의존성에 넣지 않는다. 넣으면 저장 직후 setLogoFile(null) 때 아직 미리보기가
  // 쓰고 있는 URL이 해제돼, 옵션을 건드리는 순간 로고가 사라진다.
  React.useEffect(() => {
    if (!logoPreview?.startsWith("blob:")) return;
    const url = logoPreview;
    return () => URL.revokeObjectURL(url);
  }, [logoPreview]);

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error("PNG, JPG, WebP 이미지만 올릴 수 있습니다.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("로고 이미지는 512KB 이하여야 합니다.");
      return;
    }

    setLogoFile(file);
    setLogoPath(null);
    setLogoPreview(URL.createObjectURL(file));
  }

  function clearLogo() {
    setLogoFile(null);
    setLogoPath(null);
    setLogoPreview(null);
  }

  const fileSlug = toFileSlug(label || QR_KIND_LABELS[kind]);

  async function handleDownloadPng() {
    const canvas = canvasRef.current;
    if (!canvas || !payload) return;
    try {
      const blob = await canvasToPngBlob(canvas);
      downloadBlob(blob, `${fileSlug}.png`);
    } catch {
      toast.error("PNG를 만들지 못했습니다.");
    }
  }

  async function handleDownloadSvg() {
    if (!payload) return;
    try {
      // SVG에는 외부 URL을 넣을 수 없으므로 로고를 data URL로 인라인한다.
      let logoSrc: string | null = null;
      if (logoPreview) {
        const response = await fetch(logoPreview);
        const blob = await response.blob();
        logoSrc = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("로고를 읽지 못했습니다."));
          reader.readAsDataURL(blob);
        });
      }
      const svg = await renderSvg({ payload, options, logoSrc });
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${fileSlug}.svg`);
    } catch {
      toast.error("SVG를 만들지 못했습니다.");
    }
  }

  function handleSave() {
    if (!validation.success) {
      toast.error(validationMessage ?? "입력값을 확인해 주세요.");
      return;
    }

    startSaving(async () => {
      let uploadedPath = logoPath;

      if (logoFile) {
        const extension =
          logoFile.type === "image/png"
            ? "png"
            : logoFile.type === "image/webp"
              ? "webp"
              : "jpg";
        // 경로 첫 세그먼트가 소유자 판별 기준이므로 반드시 본인 id로 시작해야 한다.
        const path = `${userId}/${crypto.randomUUID()}.${extension}`;
        const supabase = createClient();
        const { error } = await supabase.storage
          .from("qr-logos")
          .upload(path, logoFile, {
            contentType: logoFile.type,
            upsert: false,
          });

        if (error) {
          toast.error("로고를 업로드하지 못했습니다.");
          return;
        }
        uploadedPath = path;
        setLogoPath(path);
        setLogoFile(null);
      }

      const result = await saveQrCodeAction({
        label,
        fields: validation.data,
        options,
        logoPath: uploadedPath,
      });

      if (result.ok) {
        toast.success("내 기록에 저장했습니다.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. 종류 선택</CardTitle>
            <CardDescription>
              QR을 스캔했을 때 어떤 동작을 할지 고릅니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Segmented
              value={kind}
              onChange={setKind}
              options={QR_KINDS.map((item) => ({
                value: item,
                label: QR_KIND_LABELS[item],
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. 내용 입력</CardTitle>
            <CardDescription>
              입력하는 즉시 오른쪽 미리보기에 반영됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.kind === "url" ? (
              <div className="space-y-1.5">
                <Label htmlFor="url">웹사이트 주소</Label>
                <Input
                  id="url"
                  value={fields.url}
                  inputMode="url"
                  spellCheck={false}
                  onChange={(event) => patch({ url: event.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            ) : null}

            {fields.kind === "text" ? (
              <div className="space-y-1.5">
                <Label htmlFor="text">텍스트</Label>
                <Textarea
                  id="text"
                  rows={5}
                  value={fields.text}
                  onChange={(event) => patch({ text: event.target.value })}
                  placeholder="QR에 담을 문구를 입력하세요."
                />
              </div>
            ) : null}

            {fields.kind === "email" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="to">받는 사람</Label>
                  <Input
                    id="to"
                    type="email"
                    value={fields.to}
                    onChange={(event) => patch({ to: event.target.value })}
                    placeholder="hello@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">제목</Label>
                  <Input
                    id="subject"
                    value={fields.subject}
                    onChange={(event) => patch({ subject: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="body">본문</Label>
                  <Textarea
                    id="body"
                    rows={3}
                    value={fields.body}
                    onChange={(event) => patch({ body: event.target.value })}
                  />
                </div>
              </>
            ) : null}

            {fields.kind === "phone" ? (
              <div className="space-y-1.5">
                <Label htmlFor="phone">전화번호</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={fields.phone}
                  onChange={(event) => patch({ phone: event.target.value })}
                  placeholder="010-1234-5678"
                />
              </div>
            ) : null}

            {fields.kind === "sms" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="sms-phone">받는 번호</Label>
                  <Input
                    id="sms-phone"
                    type="tel"
                    value={fields.phone}
                    onChange={(event) => patch({ phone: event.target.value })}
                    placeholder="010-1234-5678"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">메시지</Label>
                  <Textarea
                    id="message"
                    rows={3}
                    value={fields.message}
                    onChange={(event) => patch({ message: event.target.value })}
                  />
                </div>
              </>
            ) : null}

            {fields.kind === "wifi" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="ssid">네트워크 이름 (SSID)</Label>
                  <Input
                    id="ssid"
                    value={fields.ssid}
                    spellCheck={false}
                    onChange={(event) => patch({ ssid: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>보안 방식</Label>
                  <Segmented
                    value={fields.encryption}
                    options={WIFI_ENCRYPTIONS}
                    onChange={(value) => patch({ encryption: value })}
                  />
                </div>
                {fields.encryption !== "nopass" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="wifi-password">비밀번호</Label>
                    <Input
                      id="wifi-password"
                      type="password"
                      value={fields.password}
                      spellCheck={false}
                      autoComplete="off"
                      onChange={(event) =>
                        patch({ password: event.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Wi-Fi 비밀번호는 QR 안에 평문으로 들어갑니다. 인쇄물로
                      배포할 때는 노출 범위를 고려하세요.
                    </p>
                  </div>
                ) : null}
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label htmlFor="hidden">숨겨진 네트워크</Label>
                  <Switch
                    id="hidden"
                    checked={fields.hidden}
                    onCheckedChange={(checked) => patch({ hidden: checked })}
                  />
                </div>
              </>
            ) : null}

            {fields.kind === "vcard" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">이름</Label>
                  <Input
                    id="firstName"
                    value={fields.firstName}
                    onChange={(event) =>
                      patch({ firstName: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">성</Label>
                  <Input
                    id="lastName"
                    value={fields.lastName}
                    onChange={(event) => patch({ lastName: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="organization">회사</Label>
                  <Input
                    id="organization"
                    value={fields.organization}
                    onChange={(event) =>
                      patch({ organization: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="title">직함</Label>
                  <Input
                    id="title"
                    value={fields.title}
                    onChange={(event) => patch({ title: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vcard-phone">전화</Label>
                  <Input
                    id="vcard-phone"
                    type="tel"
                    value={fields.phone}
                    onChange={(event) => patch({ phone: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vcard-email">이메일</Label>
                  <Input
                    id="vcard-email"
                    type="email"
                    value={fields.email}
                    onChange={(event) => patch({ email: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="vcard-url">웹사이트</Label>
                  <Input
                    id="vcard-url"
                    value={fields.url}
                    spellCheck={false}
                    onChange={(event) => patch({ url: event.target.value })}
                  />
                </div>
              </div>
            ) : null}

            {validationMessage ? (
              <p className="text-sm text-destructive" role="alert">
                {validationMessage}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. 디자인</CardTitle>
            <CardDescription>
              색 대비가 낮거나 로고가 너무 크면 스캔이 실패할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField
                id="darkColor"
                label="전경색"
                value={options.darkColor}
                onChange={(darkColor) =>
                  setOptions((prev) => ({ ...prev, darkColor }))
                }
              />
              <ColorField
                id="lightColor"
                label="배경색"
                value={options.lightColor}
                onChange={(lightColor) =>
                  setOptions((prev) => ({ ...prev, lightColor }))
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>크기</Label>
                <span className="text-sm text-muted-foreground">
                  {options.size}px
                </span>
              </div>
              <Slider
                thumbLabel="크기"
                formatValueText={(value) => `${value}픽셀`}
                min={128}
                max={1024}
                step={32}
                value={[options.size]}
                onValueChange={(value) =>
                  setOptions((prev) => ({
                    ...prev,
                    size: Array.isArray(value) ? value[0] : value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>여백</Label>
                <span className="text-sm text-muted-foreground">
                  {options.margin}
                </span>
              </div>
              <Slider
                thumbLabel="여백"
                formatValueText={(value) => `${value}칸`}
                min={0}
                max={8}
                step={1}
                value={[options.margin]}
                onValueChange={(value) =>
                  setOptions((prev) => ({
                    ...prev,
                    margin: Array.isArray(value) ? value[0] : value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>오류 보정 수준</Label>
              <Segmented
                value={options.errorCorrectionLevel}
                options={ECC_LEVELS}
                onChange={(errorCorrectionLevel) =>
                  setOptions((prev) => ({ ...prev, errorCorrectionLevel }))
                }
              />
              <p className="text-xs text-muted-foreground">
                로고를 얹을 때는 Q 또는 H를 권장합니다.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>가운데 로고 (선택)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "cursor-pointer",
                  )}
                >
                  <ImagePlus className="size-3.5" aria-hidden />
                  이미지 선택
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={handleLogoChange}
                  />
                </label>
                {logoPreview ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearLogo}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    제거
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG · JPG · WebP, 512KB 이하
              </p>

              {logoPreview ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>로고 크기</Label>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(options.logoScale * 100)}%
                    </span>
                  </div>
                  <Slider
                    thumbLabel="로고 크기"
                    formatValueText={(value) => `${value}퍼센트`}
                    min={10}
                    max={30}
                    step={1}
                    value={[Math.round(options.logoScale * 100)]}
                    onValueChange={(value) =>
                      setOptions((prev) => ({
                        ...prev,
                        logoScale:
                          (Array.isArray(value) ? value[0] : value) / 100,
                      }))
                    }
                  />
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>미리보기</CardTitle>
            <CardDescription>
              저장하면 내 기록에서 다시 불러올 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="grid aspect-square w-full place-items-center overflow-hidden rounded-xl border border-border p-4"
              style={{ backgroundColor: options.lightColor }}
            >
              {payload ? (
                <canvas
                  ref={canvasRef}
                  className="h-auto w-full max-w-[280px]"
                  aria-label="QR 코드 미리보기"
                />
              ) : (
                <p className="px-6 text-center text-sm text-muted-foreground">
                  내용을 입력하면 QR 코드가 나타납니다.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!payload}
                onClick={handleDownloadPng}
              >
                <Download className="size-3.5" aria-hidden />
                PNG
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!payload}
                onClick={handleDownloadSvg}
              >
                <Download className="size-3.5" aria-hidden />
                SVG
              </Button>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="label">기록 이름</Label>
              <Input
                id="label"
                value={label}
                maxLength={80}
                placeholder="비워두면 자동으로 지정됩니다"
                onChange={(event) => setLabel(event.target.value)}
              />
            </div>

            <Button
              type="button"
              className="w-full"
              size="lg"
              disabled={!payload || isSaving}
              onClick={handleSave}
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              내 기록에 저장
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
