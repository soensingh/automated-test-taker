const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const withBase = (route: string) => `${apiBaseUrl}${route}`;

export const apiRoutes = {
  sendOtp:
    process.env.NEXT_PUBLIC_API_AUTH_SEND_OTP_URL ??
    withBase("/api/auth/send-otp"),
  signIn:
    process.env.NEXT_PUBLIC_API_AUTH_SIGNIN_URL ?? withBase("/api/auth/signin"),
  dashboard:
    process.env.NEXT_PUBLIC_API_DASHBOARD_URL ?? withBase("/dashboard"),
};
