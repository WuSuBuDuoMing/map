import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/server/auth";
import { createJsonStore } from "@/lib/server/createJsonStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { isRecord, assertSameOrigin, assertContentLength } from "@/lib/server/validation";

type AuthConfig = Record<string, unknown>;

let cachedConfigPath: string | null = null;
let authConfigStore: ReturnType<typeof createJsonStore<AuthConfig>> | null = null;

function getAuthConfigStore(configPath: string): ReturnType<typeof createJsonStore<AuthConfig>> {
  if (cachedConfigPath !== configPath) {
    cachedConfigPath = configPath;
    authConfigStore = createJsonStore<AuthConfig>({
      filePath: configPath,
      fallback: {},
      name: "auth-config",
    });
  }
  return authConfigStore!;
}

export async function POST(request: NextRequest) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const tooLarge = assertContentLength(request, 1024);
  if (tooLarge) return tooLarge;

  const authError = requireAdminSession(request);
  if (authError) return authError;

  const payload = await request.json().catch(() => null);
  if (!isRecord(payload)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const target = payload.target === "admin" ? "admin" : payload.target === "site" ? "site" : null;
  const newPassword = typeof payload.newPassword === "string" ? payload.newPassword.trim() : "";

  if (!target) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }
  if (newPassword.length < 1 || newPassword.length > 64) {
    return NextResponse.json({ error: "Password length must be 1-64" }, { status: 400 });
  }

  // Update the running server immediately (verifyPassword reads process.env).
  // NOTE: In a desktop-only scenario, process.env is process-scoped and will
  // be lost on restart. Persistence is handled below via the auth config file.
  // In a server-deployed scenario, process.env changes are ephemeral and would
  // need a secrets manager or database-backed config to survive restarts.
  if (target === "site") {
    process.env.SITE_PASSWORD = newPassword;
  } else {
    process.env.ADMIN_PASSWORD = newPassword;
  }

  // Audit log (no plaintext passwords logged)
  console.log(`[auth] Password changed for target="${target}" by admin session`);

  // Persist to the desktop auth config so the new password survives restarts.
  const configPath = process.env.MAP_OF_US_AUTH_CONFIG;
  if (configPath) {
    try {
      const store = getAuthConfigStore(configPath);
      const config = await store.read();

      config.sitePassword = process.env.SITE_PASSWORD;
      config.adminPassword = process.env.ADMIN_PASSWORD;
      if (typeof config.cookieSecret !== "string" && process.env.AUTH_COOKIE_SECRET) {
        config.cookieSecret = process.env.AUTH_COOKIE_SECRET;
      }

      await store.write(config);
    } catch {
      return NextResponse.json(
        { error: "Password updated for this session, but saving to disk failed." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, persisted: Boolean(configPath) });
}
