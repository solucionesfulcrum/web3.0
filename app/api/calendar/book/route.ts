import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { BookingError, MEETING_MS, overlaps, TIMEZONE, validateBooking, validateStart } from "@/lib/calendar-scheduling";
import { getGoogleCalendar, getMeetUrl, queryBusy, waitForMeet } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import type { calendar_v3 } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const meetingSelect = { id: true, startAt: true, endAt: true, meetUrl: true, calendarHtmlUrl: true } as const;

function fail(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status, headers });
}

function summary(value: string | null | undefined, limit: number) {
  return value?.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return fail(404, "Ruta disponible solo en desarrollo.");

  let body: unknown;
  try { body = await request.json(); } catch { return fail(400, "Envía un cuerpo JSON válido."); }

  let calendar: ReturnType<typeof getGoogleCalendar> | undefined;
  let insertedEvent: calendar_v3.Schema$Event | undefined;
  // A known event ID lets us reconcile a timeout without issuing a second insert.
  const googleEventId = randomUUID().replace(/-/g, "");
  let insertAttempted = false;

  try {
    const input = validateBooking(body);
    const startAt = new Date(input.slot.start);
    const endAt = new Date(startAt.getTime() + MEETING_MS);
    calendar = getGoogleCalendar();
    const client = calendar;

    let meeting = await prisma.$transaction(async (tx) => {
      // Transaction-scoped PostgreSQL lock works across processes and server instances.
      // Every allowed meeting is aligned to the same 30-minute grid.
      const slotKey = Math.floor(startAt.getTime() / MEETING_MS);
      const locks = await tx.$queryRaw<{ acquired: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(714203, ${slotKey}::integer) AS acquired
      `;
      if (!locks[0]?.acquired) throw new BookingError(409, "Ese horario ya no está disponible");

      const lead = input.leadId === undefined ? null : await tx.lead.findUnique({
        where: { id: input.leadId },
        select: { id: true, service: true, requirement: true, aiSummary: true },
      });
      if (input.leadId !== undefined && !lead) throw new BookingError(404, "El lead indicado no existe.");

      const existing = await tx.meeting.findFirst({
        where: { status: "SCHEDULED", startAt: { lt: endAt }, endAt: { gt: startAt } },
        select: { id: true },
      });
      if (existing) throw new BookingError(409, "Ese horario ya no está disponible");

      const description = [
        "Reunión comercial con FULCRUM para conocer sus necesidades y evaluar cómo podemos apoyar su proyecto.",
        input.name ? `Participante: ${summary(input.name, 150)}` : undefined,
        lead?.service ? `Servicio de interés: ${summary(lead.service, 240)}` : undefined,
        lead?.requirement ? `Necesidad principal: ${summary(lead.requirement, 600)}` : undefined,
        lead?.aiSummary ? `Resumen de la consulta: ${summary(lead.aiSummary, 600)}` : undefined,
      ].filter(Boolean).join("\n\n");
      const title = "FULCRUM - Reunión comercial";

      // Mandatory exact-range check immediately before inserting the event.
      const busy = await queryBusy(client, input.slot.start, input.slot.end);
      if (overlaps(startAt.getTime(), endAt.getTime(), busy)) throw new BookingError(409, "Ese horario ya no está disponible");
      validateStart(input.slot.start);
      insertAttempted = true;
      const result = await client.events.insert({
        calendarId: "primary",
        conferenceDataVersion: 1,
        sendUpdates: "all",
        requestBody: {
          id: googleEventId,
          summary: title,
          description,
          start: { dateTime: input.slot.start, timeZone: TIMEZONE },
          end: { dateTime: input.slot.end, timeZone: TIMEZONE },
          transparency: "opaque",
          attendees: [{ email: input.email, ...(input.name ? { displayName: input.name } : {}) }],
          conferenceData: { createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } } },
        },
      }, { timeout: 10000, retry: false });
      insertedEvent = result.data;
      return tx.meeting.create({
        data: {
          leadId: input.leadId,
          googleEventId,
          calendarHtmlUrl: insertedEvent.htmlLink,
          meetUrl: getMeetUrl(insertedEvent),
          attendeeEmail: input.email,
          attendeeName: input.name,
          title,
          description,
          startAt,
          endAt,
          status: "SCHEDULED",
        },
        select: meetingSelect,
      });
    }, { maxWait: 5000, timeout: 45000 });

    // The booking is durable before waiting for asynchronous Meet generation.
    // A polling failure must never roll back or repeat a confirmed booking.
    if (!meeting.meetUrl && insertedEvent) {
      try {
        const event = await waitForMeet(client, insertedEvent);
        const meetUrl = getMeetUrl(event);
        if (meetUrl) meeting = await prisma.meeting.update({ where: { id: meeting.id }, data: { meetUrl }, select: meetingSelect });
      } catch { /* Keep the saved booking and return the Calendar link. */ }
    }
    return NextResponse.json({
      success: true,
      meeting,
      ...(!meeting.meetUrl ? { warning: "La reserva está guardada. El enlace de Meet aún no está disponible; revisa calendarHtmlUrl. No repitas la reserva." } : {}),
    }, { status: 201, headers });
  } catch (error) {
    if (error instanceof BookingError) return fail(error.status, error.message);
    if (insertAttempted && calendar) {
      // PostgreSQL and Google cannot share a transaction. Reconcile before cleanup,
      // including the case where the database committed but its response was lost.
      try {
        const saved = await prisma.meeting.findUnique({ where: { googleEventId }, select: meetingSelect });
        if (saved) return NextResponse.json({ success: true, meeting: saved }, { status: 201, headers });
        // Only remove this request's new event, never an existing calendar event.
        await calendar.events.delete({ calendarId: "primary", eventId: googleEventId, sendUpdates: "all" }, { timeout: 10000, retry: false });
        return fail(500, "No se pudo guardar la reserva. Se canceló el evento creado; vuelve a consultar disponibilidad.");
      } catch {
        return fail(500, "No se pudo confirmar la reserva. Revisa Google Calendar y PostgreSQL antes de repetirla; podría existir un evento pendiente de conciliación.");
      }
    }
    return fail(500, "No se pudo completar la reserva. Inténtalo nuevamente.");
  }
}
