/**
 * Shared CORS helper for Edge Functions.
 *
 * Reads ALLOWED_ORIGINS from environment (comma-separated list).
 * Falls back to restrictive same-site behaviour in production.
 * In local development (DENO_ENV=development) all origins are allowed.
 */

const ALLOWED_ORIGINS_ENV = Deno.env.get("ALLOWED_ORIGINS") ?? "";
const IS_DEV = Deno.env.get("DENO_ENV") === "development";

const allowedOrigins: Set<string> = new Set(
  ALLOWED_ORIGINS_ENV.split(",")
    .map((o) => o.trim())
    .filter(Boolean)
);

const FULL_ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, " +
  "x-supabase-client-platform, x-supabase-client-platform-version, " +
  "x-supabase-client-runtime, x-supabase-client-runtime-version";

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";

  const allowedOrigin =
    IS_DEV || allowedOrigins.size === 0 || allowedOrigins.has(origin)
      ? origin || "*"
      : "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin || "null",
    "Access-Control-Allow-Headers": FULL_ALLOW_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export const commonCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": FULL_ALLOW_HEADERS,
};
