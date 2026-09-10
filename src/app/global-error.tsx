"use client";

/**
 * 루트 레이아웃이 무너졌을 때만 뜨는 최후의 화면.
 *
 * 이 파일은 루트 레이아웃을 대체하므로 <html>·<body>를 직접 만들어야 하고,
 * 전역 CSS와 폰트가 실리지 않는다. 그래서 스타일을 인라인으로 두고, 색은 OS 설정을
 * 따라가는 시스템 색상 키워드로 지정한다(앱의 테마 토글은 여기까지 닿지 않는다).
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="ko" style={{ colorScheme: "light dark" }}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem 1rem",
          background: "Canvas",
          color: "CanvasText",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', 'Malgun Gothic', sans-serif",
        }}
      >
        <title>문제가 발생했습니다 · QR 코드 생성기</title>
        <div style={{ maxWidth: "24rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.125rem", margin: "0 0 0.5rem" }}>
            문제가 발생했습니다
          </h1>
          <p style={{ margin: "0 0 0.75rem", opacity: 0.7, fontSize: "0.875rem" }}>
            페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
          <p
            style={{
              margin: "0 0 1.25rem",
              opacity: 0.55,
              fontSize: "0.75rem",
              fontFamily: "ui-monospace, monospace",
              minHeight: "1rem",
            }}
          >
            {error.digest ? `오류 번호 ${error.digest}` : null}
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              font: "inherit",
              fontSize: "0.875rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid currentColor",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
