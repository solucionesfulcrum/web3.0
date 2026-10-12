import { randomBytes } from "node:crypto";
import { google } from "googleapis";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

export async function GET() {
  // Temporary credential setup utility: never expose it in production.
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Ruta disponible solo en desarrollo." }, { status: 404, headers });
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { error: "Configura GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REDIRECT_URI en .env.local." },
        { status: 500, headers },
      );
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const state = randomBytes(32).toString("hex");
    const authorizationUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.freebusy",
      ],
      state,
    });

    const response = NextResponse.redirect(authorizationUrl, { headers });
    response.cookies.set("google_oauth_state", state, {
      httpOnly: true,
      secure: new URL(redirectUri).protocol === "https:",
      sameSite: "lax",
      path: "/api/google",
      maxAge: 600,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "No se pudo iniciar la autorización de Google. Revisa la configuración OAuth del servidor." },
      { status: 500, headers },
    );
  }
}
