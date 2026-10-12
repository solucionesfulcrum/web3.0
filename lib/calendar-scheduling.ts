export const TIMEZONE = "America/Lima";
export const LIMA_OFFSET = "-05:00";
export const MEETING_MS = 30 * 60 * 1000;
export const BUFFER_MS = 30 * 60 * 1000;

export type Slot = { start: string; end: string; label: string };
export type BusyRange = { start: number; end: number };

export class BookingError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date.startsWith("0000")) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function isWeekday(date: string): boolean {
  const day = new Date(`${date}T12:00:00${LIMA_OFFSET}`).getUTCDay();
  return day >= 1 && day <= 5;
}

export function businessSlots(date: string, now = Date.now()): Slot[] {
  if (!isValidDate(date) || !isWeekday(date)) return [];
  const slots: Slot[] = [];
  for (let minute = 9 * 60; minute < 18 * 60; minute += 30) {
    const label = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    const endMinute = minute + 30;
    const endLabel = `${String(Math.floor(endMinute / 60)).padStart(2, "0")}:${String(endMinute % 60).padStart(2, "0")}`;
    const start = `${date}T${label}:00${LIMA_OFFSET}`;
    if (Date.parse(start) < now + BUFFER_MS) continue;
    slots.push({ start, end: `${date}T${endLabel}:00${LIMA_OFFSET}`, label });
  }
  return slots;
}

export function overlaps(start: number, end: number, busy: BusyRange[]): boolean {
  return busy.some((range) => start < range.end && end > range.start);
}

export function validateStart(value: unknown, now = Date.now()): Slot {
  // Require the exact Lima format returned by availability; reject implicit server time.
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00-05:00$/.test(value)) {
    throw new BookingError(400, "start debe tener formato YYYY-MM-DDTHH:mm:00-05:00 (America/Lima).");
  }
  const slot = businessSlots(value.slice(0, 10), now).find((candidate) => candidate.start === value);
  if (!slot) {
    throw new BookingError(400, "Elige un horario de lunes a viernes entre 09:00 y 17:30, cada 30 minutos y con al menos 30 minutos de anticipación.");
  }
  return slot;
}

export function validateBooking(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BookingError(400, "Envía un objeto JSON válido.");
  }
  const input = body as Record<string, unknown>;
  const email = typeof input.email === "string" ? input.email.trim() : "";
  if (email.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(email)) {
    throw new BookingError(400, "Ingresa un email válido.");
  }
  if (input.name != null && (typeof input.name !== "string" || input.name.trim().length > 150 || /[\u0000-\u001f\u007f]/.test(input.name))) {
    throw new BookingError(400, "name debe ser un texto de hasta 150 caracteres sin saltos de línea.");
  }
  if (input.leadId != null && (typeof input.leadId !== "number" || !Number.isInteger(input.leadId) || input.leadId <= 0 || input.leadId > 2147483647)) {
    throw new BookingError(400, "leadId debe ser un entero positivo válido.");
  }
  if ("end" in input) throw new BookingError(400, "No envíes end: el servidor calcula la duración de 30 minutos.");
  return {
    email,
    name: typeof input.name === "string" ? input.name.trim() || undefined : undefined,
    leadId: typeof input.leadId === "number" ? input.leadId : undefined,
    slot: validateStart(input.start),
  };
}
