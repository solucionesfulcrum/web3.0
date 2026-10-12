import "server-only";
import { setTimeout } from "node:timers/promises";
import { google, calendar_v3 } from "googleapis";
import { BusyRange, TIMEZONE } from "@/lib/calendar-scheduling";

export function getGoogleCalendar() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
    throw new Error("Google Calendar no está configurado.");
  }
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function queryBusy(calendar: calendar_v3.Calendar, start: string, end: string): Promise<BusyRange[]> {
  const { data } = await calendar.freebusy.query({
    requestBody: { timeMin: start, timeMax: end, timeZone: TIMEZONE, items: [{ id: "primary" }] },
  }, { timeout: 10000, retry: false });
  const result = data.calendars?.primary;
  // A successful HTTP response can still contain per-calendar errors. Fail closed.
  if (!result || result.errors?.length || !Array.isArray(result.busy)) {
    throw new Error("No se pudo verificar la disponibilidad.");
  }
  return result.busy.map((range) => {
    const start = Date.parse(range.start ?? "");
    const end = Date.parse(range.end ?? "");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      throw new Error("Respuesta de disponibilidad inválida.");
    }
    return { start, end };
  });
}

export function getMeetUrl(event: calendar_v3.Schema$Event): string | null {
  return event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri ?? null;
}

export async function waitForMeet(calendar: calendar_v3.Calendar, initial: calendar_v3.Schema$Event) {
  let event = initial;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (getMeetUrl(event) || !event.id || event.conferenceData?.createRequest?.status?.statusCode !== "pending") break;
    await setTimeout(500);
    const result = await calendar.events.get({ calendarId: "primary", eventId: event.id }, { timeout: 5000, retry: false });
    event = result.data;
  }
  return event;
}
