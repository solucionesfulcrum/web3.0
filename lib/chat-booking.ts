// Browser-safe presentation helpers. Availability always comes from the API.
export type BookingSlot = { start: string; end: string; label: string };
export type ChatMeeting = { startAt: string; endAt: string; meetUrl: string | null; calendarHtmlUrl: string | null };
const timezone = "America/Lima";

export function bookingDates(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  const today = new Date(`${part("year")}-${part("month")}-${part("day")}T12:00:00-05:00`);
  return Array.from({ length: 7 }, (_, index) => new Date(today.getTime() + index * 86400000))
    .filter(date => date.getUTCDay() !== 0 && date.getUTCDay() !== 6)
    .map(date => date.toISOString().slice(0, 10));
}

export function bookingDateLabel(value: string) {
  return new Intl.DateTimeFormat("es-PE", { timeZone: timezone, weekday: "long", day: "numeric", month: "long" })
    .format(new Date(value.length === 10 ? `${value}T12:00:00-05:00` : value));
}

export function bookingTimeLabel(value: string) {
  return new Intl.DateTimeFormat("es-PE", { timeZone: timezone, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(value));
}

export function validBookingEmail(value: string) {
  return value.length <= 254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(value);
}

export function safeBookingLink(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { return new URL(value).protocol === "https:" ? value : null; } catch { return null; }
}

export function parseChatMeeting(value: unknown): ChatMeeting | null {
  if (!value || typeof value !== "object") return null;
  const meeting = value as Record<string, unknown>;
  if (typeof meeting.startAt !== "string" || !Number.isFinite(Date.parse(meeting.startAt)) ||
      typeof meeting.endAt !== "string" || !Number.isFinite(Date.parse(meeting.endAt))) return null;
  return {
    startAt: meeting.startAt, endAt: meeting.endAt,
    meetUrl: safeBookingLink(meeting.meetUrl), calendarHtmlUrl: safeBookingLink(meeting.calendarHtmlUrl),
  };
}

// Do not render model-authored meeting confirmations, links or availability claims.
// Only the booking component can display those facts after the Calendar response.
export function isValidLeadId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2147483647;
}

export function safeBookingReply(reply: string, leadCreated: boolean, leadId: unknown = null) {
  const schedulingClaim = /(?:reuni[oó]n|cita|reserva).{0,70}(?:confirmad|agendad|reservad|programad)|(?:confirmad|agendad|reservad|programad).{0,70}(?:reuni[oó]n|cita)|(?:he|hemos|ya|te).{0,30}(?:agendado|reservado|programado|confirmado)|(?:horarios?|slots?).{0,40}(?:disponibles?|libres?)|(?:disponibles?|libres?).{0,40}(?:horarios?|slots?)|(?:meet\.google|calendar\.google)|(?:invitaci[oó]n).{0,30}(?:enviad)|(?:reunirnos|reuni[oó]n|agendar|reservar|disponibilidad).{0,80}(?:\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm|a\.\s*m\.|p\.\s*m\.))/i;
  const normalized = reply.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
  const promisedFollowup = /(?:especialista|equipo|alguien|asesor).{0,60}(?:contactara|comunicara|pondra\s+en\s+contacto|llamara)|te\s+(?:estaremos\s+llamando|contactaremos|llamaremos)|(?:deseas|quieres).{0,70}(?:se\s+comunique|te\s+contacte|te\s+llame)/i;
  if (promisedFollowup.test(normalized)) return leadCreated && isValidLeadId(leadId)
    ? "Tu solicitud puede ser revisada por el equipo de FULCRUM."
    : "Podemos registrar tu solicitud para que el equipo de FULCRUM pueda revisarla.";
  const inventedControls = /boton|haz\s+(?:clic|click)|deberias\s+ver|selector\s+de\s+fechas|selecciona\w*\s+(?:un|el|tu)\s+horario|elige\s+(?:una|la|tu)\s+fecha|debajo\s+del?\s+chat|menu\s+de\s+opciones|[«"“]agendar\s+(?:una\s+)?reunion|google\s+meet.{0,40}confirmad/i;
  if (!schedulingClaim.test(reply.replace(/\s+/g, " ")) && !inventedControls.test(normalized)) return reply;
  return leadCreated && isValidLeadId(leadId)
    ? "Podemos seguir conversando sobre tu proyecto y los próximos pasos."
    : "Podemos conversar sobre tu proyecto y coordinar una reunión cuando tu solicitud esté registrada.";
}
