/**
 * Supabase Auth가 내려주는 영문 오류를 화면에 띄울 한국어 문구로 바꾼다.
 *
 * 보안: 원문(`error.message`)은 영어인 데다 서버 내부 사정을 그대로 드러내므로
 * 사용자에게 직접 노출하지 않는다. 코드 이름은 `@supabase/auth-js`의 `ErrorCode`를
 * 따르고, 서버가 SDK보다 새로우면 목록에 없는 코드도 올 수 있으므로 마지막에는
 * 항상 기본 문구로 떨어뜨린다.
 */

/**
 * `AuthError`를 직접 import하지 않고 필요한 모양만 받는다.
 * `@supabase/auth-js`는 전이 의존성이라 직접 import하면 버전에 묶인다.
 */
type AuthErrorLike = {
  code?: string | null;
  status?: number | null;
};

const FALLBACK = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

const RATE_LIMITED = "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.";

const MESSAGES: Record<string, string> = {
  // 발송·요청 한도
  over_email_send_rate_limit:
    "확인 메일 발송 한도를 넘었습니다. 잠시 후 다시 시도해 주세요.",
  over_request_rate_limit: RATE_LIMITED,
  over_sms_send_rate_limit: RATE_LIMITED,

  // 입력값
  email_address_invalid: "사용할 수 없는 이메일 주소입니다.",
  email_address_not_authorized: "이 이메일 주소로는 가입할 수 없습니다.",
  weak_password: "비밀번호가 너무 단순합니다. 다른 비밀번호로 만들어 주세요.",
  validation_failed: "입력값을 확인해 주세요.",

  // 계정 상태.
  // 이 코드들은 Supabase가 계정 존재를 이미 드러낸 경우에만 온다(확인 메일이 꺼져 있을 때).
  // 그래서 구체적으로 안내해도 여기서 새로 새는 정보는 없다.
  email_exists: "이미 가입된 이메일입니다. 로그인해 주세요.",
  user_already_exists: "이미 가입된 이메일입니다. 로그인해 주세요.",
  user_banned: "이용이 제한된 계정입니다.",

  // 기능 비활성화
  signup_disabled: "현재 회원가입을 받고 있지 않습니다.",
  email_provider_disabled: "이메일 회원가입이 비활성화되어 있습니다.",
  provider_disabled: "현재 이 로그인 방식은 쓸 수 없습니다.",

  // 링크·토큰
  otp_expired: "링크가 만료됐습니다. 다시 요청해 주세요.",
  flow_state_expired: "인증 절차가 만료됐습니다. 처음부터 다시 시도해 주세요.",
  flow_state_not_found:
    "인증 정보를 찾을 수 없습니다. 처음부터 다시 시도해 주세요.",

  // 기타
  captcha_failed: "보안 문자 확인에 실패했습니다.",
  request_timeout: "요청 시간이 초과됐습니다. 다시 시도해 주세요.",
};

export function authErrorMessage(
  error: AuthErrorLike | null | undefined,
): string {
  if (!error) return FALLBACK;

  const mapped = error.code ? MESSAGES[error.code] : undefined;
  if (mapped) return mapped;

  // 목록에 없는 코드라도 429면 한도 초과가 확실하다.
  if (error.status === 429) return RATE_LIMITED;

  return FALLBACK;
}

/**
 * 로그인 실패 문구.
 *
 * 보안: 실패 원인을 구분해 알려주면 계정 존재 여부가 새므로(계정 열거) 기본은 한 문구로 고정한다.
 * 다만 한도 초과는 계정과 무관한 정보이고, 이걸 감추면 사용자가 비밀번호가 틀린 줄 알고
 * 계속 재시도하게 되므로 그대로 알려준다.
 */
export function signInErrorMessage(
  error: AuthErrorLike | null | undefined,
): string {
  if (error?.code === "over_request_rate_limit" || error?.status === 429) {
    return RATE_LIMITED;
  }
  return "이메일 또는 비밀번호가 올바르지 않습니다.";
}
