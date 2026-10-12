import { timingSafeEqual } from "node:crypto";
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respond(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    },
  });
  response.cookies.set("google_oauth_state", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/google",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  // Only show credentials during local setup, never in production.
  if (process.env.NODE_ENV !== "development") {
    return respond({ error: "Ruta disponible solo en desarrollo." }, 404);
  }

  try {
    const params = request.nextUrl.searchParams;
    if (params.has("error")) {
      return respond({ error: "Google no completó la autorización. Vuelve a iniciar el flujo en /api/google/auth y acepta los permisos." }, 400);
    }

    const code = params.get("code");
    if (!code) {
      return respond({ error: "Falta el parámetro code de Google. Inicia la autorización en /api/google/auth." }, 400);
    }

    const state = params.get("state");
    const expectedState = request.cookies.get("google_oauth_state")?.value;
    if (
      !state || !expectedState ||
      Buffer.byteLength(state) !== Buffer.byteLength(expectedState) ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))
    ) {
      return respond({ error: "La sesión de autorización es inválida o expiró. Vuelve a iniciar el flujo en /api/google/auth." }, 400);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      return respond({ error: "Configura GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REDIRECT_URI en .env.local." }, 500);
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return respond({
        success: false,
        message: "Google completó la autorización, pero no devolvió un refresh_token. Probablemente la cuenta ya había sido autorizada. Puede ser necesario revocar el acceso anterior en tu cuenta de Google y volver a iniciar /api/google/auth con prompt=consent (ya configurado).",
      });
    }

    return respond({
      success: true,
      message: "Autorización correcta. Copia el refresh_token a GOOGLE_REFRESH_TOKEN en .env.local y cierra esta pestaña. El servidor no guarda los tokens.",
      warning: "Guarda este refresh token en .env.local y no lo compartas ni lo subas a Git.",
      refresh_token: tokens.refresh_token,
    });
  } catch {
    // OAuth errors can contain secrets or tokens: do not log or serialize them.
    return respond({ error: "No se pudo intercambiar el código por tokens. El código puede haber expirado o ya haberse utilizado. Revisa la configuración OAuth y vuelve a iniciar /api/google/auth." }, 502);
  }
}
