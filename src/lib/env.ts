export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL,
  authSecret: process.env.AUTH_SECRET,
  jwtSecret: process.env.JWT_SECRET,
  mongodbUri: process.env.MONGODB_URI,
  mongodbDbName: process.env.MONGODB_DB_NAME,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM,
};

export function requireEnv(key: keyof typeof env): string {
  const value = env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}
