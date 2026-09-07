import QRCode from "qrcode";

import type { QrOptions } from "./schema";

export type RenderInput = {
  payload: string;
  options: QrOptions;
  /** 가운데 겹칠 로고. data: URL 또는 동일 출처/서명된 이미지 URL. */
  logoSrc?: string | null;
};

/**
 * `qrcode` 라이브러리가 던지는 영문 오류를 한국어로 바꾼다.
 * 이 모듈 밖으로 나가는 오류 메시지는 그대로 사용자에게 보여줄 수 있어야 한다.
 */
function toKoreanQrError(error: unknown): Error {
  const raw = error instanceof Error ? error.message : "";

  if (/too big/i.test(raw)) {
    return new Error(
      "내용이 너무 길어 QR 코드로 만들 수 없습니다. 내용을 줄이거나 오류 보정 수준을 낮춰 보세요.",
    );
  }
  if (/no input text|invalid data/i.test(raw)) {
    return new Error("QR에 담을 내용을 입력해 주세요.");
  }
  return new Error("QR 코드를 만들지 못했습니다.");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("로고 이미지를 불러오지 못했습니다."));
    image.src = src;
  });
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/** 캔버스에 QR을 그리고, 로고가 있으면 가운데에 얹는다. */
export async function drawQr(
  canvas: HTMLCanvasElement,
  { payload, options, logoSrc }: RenderInput,
): Promise<void> {
  try {
    await QRCode.toCanvas(canvas, payload, {
      width: options.size,
      margin: options.margin,
      errorCorrectionLevel: options.errorCorrectionLevel,
      color: { dark: options.darkColor, light: options.lightColor },
    });
  } catch (error) {
    throw toKoreanQrError(error);
  }

  if (!logoSrc) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const image = await loadImage(logoSrc);
  const box = canvas.width * options.logoScale;
  const pad = box * 0.14;
  const boxX = (canvas.width - box) / 2;
  const boxY = (canvas.height - box) / 2;

  // 로고 뒤에 배경색 패드를 깔아야 모듈과 겹쳐 보이지 않는다.
  ctx.fillStyle = options.lightColor;
  roundedRectPath(
    ctx,
    boxX - pad,
    boxY - pad,
    box + pad * 2,
    box + pad * 2,
    box * 0.2,
  );
  ctx.fill();

  // 원본 비율을 유지한 채 box 안에 맞춘다(contain).
  const ratio = Math.min(image.width, image.height) / Math.max(image.width, image.height);
  const isWide = image.width >= image.height;
  const drawWidth = isWide ? box : box * ratio;
  const drawHeight = isWide ? box * ratio : box;

  ctx.drawImage(
    image,
    (canvas.width - drawWidth) / 2,
    (canvas.height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

/** SVG 문자열을 만든다. 로고가 있으면 <image>로 함께 삽입한다. */
export async function renderSvg({
  payload,
  options,
  logoSrc,
}: RenderInput): Promise<string> {
  let svg: string;
  try {
    svg = await QRCode.toString(payload, {
      type: "svg",
      margin: options.margin,
      errorCorrectionLevel: options.errorCorrectionLevel,
      color: { dark: options.darkColor, light: options.lightColor },
    });
  } catch (error) {
    throw toKoreanQrError(error);
  }

  if (!logoSrc) return svg;

  // qrcode가 만드는 SVG는 모듈 단위 좌표계를 쓴다. viewBox에서 한 변 크기를 읽어온다.
  const viewBox = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!viewBox) return svg;

  const side = Number(viewBox[1]);
  const box = side * options.logoScale;
  const pad = box * 0.14;
  const origin = (side - box) / 2;

  const overlay = [
    `<rect x="${origin - pad}" y="${origin - pad}" width="${box + pad * 2}" height="${box + pad * 2}" rx="${box * 0.2}" fill="${options.lightColor}"/>`,
    `<image x="${origin}" y="${origin}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid meet" href="${logoSrc}"/>`,
  ].join("");

  return svg.replace("</svg>", `${overlay}</svg>`);
}

/** 브라우저에서 파일 다운로드를 트리거한다. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG로 변환하지 못했습니다."));
    }, "image/png");
  });
}

/** 파일명으로 안전한 슬러그를 만든다(경로 조작·제어문자 차단). */
export function toFileSlug(value: string, fallback = "qrcode") {
  const slug = value
    .normalize("NFKC")
    .replace(/[^\p{Letter}\p{Number}\-_]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || fallback;
}
