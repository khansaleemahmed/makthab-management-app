import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  jwtSecret: required("JWT_SECRET", "dev-access-secret-change-me"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? "7d",
  // "walink" (default): client-side wa.me click-to-chat, text-only, no
  // account needed. "business-api": server sends the PDF directly via the
  // Meta Cloud API — requires the three vars below.
  whatsappGateway: process.env.WHATSAPP_GATEWAY ?? "walink",
  whatsappBusinessApiToken: process.env.WHATSAPP_BUSINESS_API_TOKEN || undefined,
  whatsappBusinessPhoneNumberId: process.env.WHATSAPP_BUSINESS_PHONE_NUMBER_ID || undefined,
  whatsappBusinessApiVersion: process.env.WHATSAPP_BUSINESS_API_VERSION ?? "v21.0",
  puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
};

export const isProd = env.nodeEnv === "production";
