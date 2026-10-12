import { NextRequest, NextResponse } from "next/server";
import { businessSlots, isValidDate, overlaps, TIMEZONE } from "@/lib/calendar-scheduling";
import { getGoogleCalendar, queryBusy } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ success: false, error: "Ruta disponible solo en desarrollo." }, { status: 404, headers });
  }
  const dates = request.nextUrl.searchParams.getAll("date");
  const date = dates[0] ?? "";
  if (dates.length !== 1 || !isValidDate(date)) {
    return NextResponse.json({ success: false, error: "date debe ser una fecha válida con formato YYYY-MM-DD." }, { status: 400, headers });
  }
  try {
    const candidates = businessSlots(date);
    if (!candidates.length) return NextResponse.json({ success: true, date, timezone: TIMEZONE, slots: [] }, { headers });
    const start = candidates[0].start;
    const end = candidates[candidates.length - 1].end;
    const [googleBusy, meetings] = await Promise.all([
      queryBusy(getGoogleCalendar(), start, end),
      prisma.meeting.findMany({
        where: { status: "SCHEDULED", startAt: { lt: new Date(end) }, endAt: { gt: new Date(start) } },
        select: { startAt: true, endAt: true },
      }),
    ]);
    const busy = [...googleBusy, ...meetings.map((meeting) => ({ start: meeting.startAt.getTime(), end: meeting.endAt.getTime() }))];
    // Recalculate the notice period after the network/database calls.
    const slots = businessSlots(date).filter((slot) => !overlaps(Date.parse(slot.start), Date.parse(slot.end), busy));
    return NextResponse.json({ success: true, date, timezone: TIMEZONE, slots }, { headers });
  } catch {
    return NextResponse.json({ success: false, error: "No se pudo consultar la disponibilidad. Inténtalo nuevamente." }, { status: 500, headers });
  }
}
