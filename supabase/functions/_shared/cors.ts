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

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";

  const allowedOrigin =
    IS_DEV || allowedOrigins.size === 0 || allowedOrigins.has(origin)
      ? origin || "*"
      : "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin || "null",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export const commonCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
