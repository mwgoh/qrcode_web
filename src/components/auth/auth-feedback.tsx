import { AlertCircle, CheckCircle2 } from "lucide-react";

/** 폼 전체에 대한 오류·안내 박스. 로그인·회원가입·비밀번호 재설정 폼이 공유한다. */
export function FormFeedback({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  return (
    <>
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-foreground"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>{notice}</span>
        </div>
      ) : null}
    </>
  );
}

/** 입력 한 칸에 붙는 오류 문구. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}
