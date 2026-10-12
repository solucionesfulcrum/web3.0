"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { bookingDates, bookingDateLabel, bookingTimeLabel, parseChatMeeting, validBookingEmail, type BookingSlot, type ChatMeeting } from "@/lib/chat-booking";
import styles from "./ChatBooking.module.css";

type Props = {
  leadId: number; name: string | null; email: string | null; open: boolean;
  onEmail: (email: string) => void;
  onBusy: (busy: boolean) => void;
  onContinue?: () => void;
};
type BookingMode = "offer" | "conversation" | "email" | "dates" | "confirm" | "completed";
const availabilityError = "No pudimos consultar los horarios en este momento. Intenta nuevamente.";
const bookingError = "No pudimos completar la reserva. Tu solicitud sigue registrada y puedes intentarlo nuevamente.";

export default function ChatBooking({ leadId, name, email, open, onEmail, onBusy, onContinue }: Props) {
  const emailId = useId();
  const [bookingMode, setBookingMode] = useState<BookingMode>("offer");
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [meeting, setMeeting] = useState<ChatMeeting | null>(null);
  const [bookingEmail, setBookingEmail] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const availabilityRequest = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  const completed = useRef(false);
  const mounted = useRef(true);
  const emailInput = useRef<HTMLInputElement>(null);
  const card = useRef<HTMLElement>(null);
  const tabIndex = open ? 0 : -1;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; availabilityRequest.current?.abort(); };
  }, []);
  useEffect(() => {
    if (open && bookingMode === "email") emailInput.current?.focus({ preventScroll: true });
    if (open) card.current?.scrollIntoView({ block: "nearest" });
  }, [bookingMode, slotsLoading, error, open]);

  function begin() {
    if (completed.current || submitting.current) return;
    setError(""); setNotice("");
    setDates(bookingDates());
    const knownEmail = bookingEmail || email?.trim() || "";
    if (validBookingEmail(knownEmail)) {
      setBookingEmail(knownEmail); setBookingMode("dates");
    } else {
      setBookingMode("email");
    }
  }

  function saveEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = emailDraft.trim();
    if (!validBookingEmail(value)) { setError("Ingresa un correo electrónico válido para enviarte la invitación."); return; }
    setBookingEmail(value); onEmail(value); setError(""); setBookingMode("dates");
  }

  function keepTalking() {
    if (submitting.current || completed.current) return;
    availabilityRequest.current?.abort(); availabilityRequest.current = null;
    setSlotsLoading(false); setSelectedDate(""); setSelectedSlot(null);
    setError(""); setNotice(""); setBookingMode("conversation");
    onContinue?.();
  }

  async function loadSlots(date: string, conflict = false) {
    if (completed.current || submitting.current) return;
    availabilityRequest.current?.abort();
    const controller = new AbortController();
    availabilityRequest.current = controller;
    setSelectedDate(date); setSelectedSlot(null); setAvailableSlots([]);
    setBookingMode("dates"); setSlotsLoading(true); setError("");
    setNotice(conflict ? "Ese horario acaba de dejar de estar disponible. Elige otro horario." : "");
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`/api/calendar/availability?date=${encodeURIComponent(date)}`, { cache: "no-store", signal: controller.signal });
      const data = await response.json();
      if (!response.ok || data?.success !== true || !Array.isArray(data.slots)) throw new Error();
      const slots: BookingSlot[] = data.slots;
      if (!slots.every(slot => slot && typeof slot.start === "string" && typeof slot.end === "string" && typeof slot.label === "string" && slot.start.startsWith(`${date}T`) && Number.isFinite(Date.parse(slot.start)))) throw new Error();
      if (mounted.current && availabilityRequest.current === controller) setAvailableSlots(slots);
    } catch {
      if (mounted.current && availabilityRequest.current === controller) setError(availabilityError);
    } finally {
      window.clearTimeout(timeout);
      if (mounted.current && availabilityRequest.current === controller) {
        setSlotsLoading(false); availabilityRequest.current = null;
      }
    }
  }

  async function confirmBooking() {
    if (submitting.current || completed.current || !selectedSlot || !validBookingEmail(bookingEmail)) return;
    submitting.current = true; setBookingLoading(true); onBusy(true); setError("");
    let conflict = false;
    try {
      // Do not abort a booking when the widget closes: it may already have sent an invitation.
      const response = await fetch("/api/calendar/book", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, ...(name ? { name } : {}), email: bookingEmail, start: selectedSlot.start }),
      });
      if (response.status === 409) { conflict = true; return; }
      const data = await response.json();
      if (!response.ok || data?.success !== true) throw new Error();
      // Success is terminal, even if optional response details are unavailable.
      completed.current = true;
      if (!mounted.current) return;
      setBookingCompleted(true); setMeeting(parseChatMeeting(data.meeting)); setBookingMode("completed");
    } catch {
      if (mounted.current) setError(bookingError);
    } finally {
      submitting.current = false;
      if (mounted.current) { setBookingLoading(false); onBusy(false); }
      if (conflict && mounted.current) void loadSlots(selectedDate, true);
    }
  }

  if (bookingMode === "conversation") return <section ref={card} className={`${styles.card} ${styles.minimized}`} aria-label="Reunión opcional">
    <span>Cuando quieras, podemos conversar por Meet.</span>
    <button type="button" onClick={begin} tabIndex={tabIndex}>Agendar reunión</button>
  </section>;

  return <section ref={card} className={styles.card} aria-label="Agendar reunión con FULCRUM" aria-busy={bookingLoading}>
    <div className={styles.eyebrow}>FULCRUM · REUNIÓN COMERCIAL</div>
    {bookingCompleted ? <>
      <h3>Tu reunión quedó agendada correctamente.</h3>
      <p>Ya tienes una reunión agendada.</p>
      {meeting && <div className={styles.details}>
        <strong>{bookingDateLabel(meeting.startAt)}</strong>
        <span>{bookingTimeLabel(meeting.startAt)} · 30 minutos</span>
        <span>Hora de Lima, Perú</span>
      </div>}
      <p>Google Calendar envió la invitación a tu correo.</p>
      <div className={styles.actions}>
        {meeting?.meetUrl && <a className={styles.primary} href={meeting.meetUrl} target="_blank" rel="noopener noreferrer" tabIndex={tabIndex}>Abrir Google Meet ↗</a>}
        {meeting?.calendarHtmlUrl && <a href={meeting.calendarHtmlUrl} target="_blank" rel="noopener noreferrer" tabIndex={tabIndex}>Ver en Google Calendar ↗</a>}
      </div>
      {!meeting?.meetUrl && <p className={styles.hint}>El enlace de Meet aún no está disponible aquí. Revisa el evento o la invitación en tu correo.</p>}
    </> : <>
      {bookingMode === "offer" && <>
        <h3>Tu solicitud ya está registrada. ¿Deseas agendar una reunión de 30 minutos con nuestro equipo?</h3>
        <div className={styles.actions}>
          <button className={styles.primary} type="button" onClick={begin} tabIndex={tabIndex}>Agendar reunión</button>
          <button type="button" onClick={keepTalking} tabIndex={tabIndex}>Seguir conversando</button>
        </div>
      </>}
      {bookingMode === "email" && <>
        <p>Para enviarte la invitación de Calendar y el enlace de Google Meet necesito un correo electrónico. ¿Cuál podemos usar?</p>
        <form onSubmit={saveEmail} noValidate className={styles.emailForm}>
          <label htmlFor={emailId}>Correo electrónico</label>
          <input ref={emailInput} id={emailId} type="email" inputMode="email" autoComplete="email" maxLength={254} value={emailDraft} onChange={event => setEmailDraft(event.target.value)} tabIndex={tabIndex} aria-describedby={error ? `${emailId}-error` : undefined} aria-invalid={!!error} placeholder="tu@correo.com" />
          <button className={styles.primary} type="submit" tabIndex={tabIndex}>Ver fechas disponibles</button>
        </form>
      </>}
      {bookingMode === "dates" && <>
        <h3>Elige una fecha</h3><p className={styles.hint}>Próximos 7 días · 30 minutos · Hora de Lima</p>
        <div className={styles.dates} aria-label="Fechas de reunión">
          {dates.map(date => <button type="button" key={date} aria-pressed={selectedDate === date} tabIndex={tabIndex} onClick={() => void loadSlots(date)}>{bookingDateLabel(date)}</button>)}
        </div>
        {notice && <p role="status" className={styles.notice}>{notice}</p>}
        {selectedDate && <>
          <h4>{bookingDateLabel(selectedDate)}</h4>
          {slotsLoading ? <p role="status">Consultando horarios…</p> : !error && (
            availableSlots.length ? <div className={styles.slots} aria-label="Horarios disponibles">
              {availableSlots.map(slot => <button type="button" key={slot.start} tabIndex={tabIndex} onClick={() => { setSelectedSlot(slot); setError(""); setBookingMode("confirm"); }}>{slot.label}</button>)}
            </div> : <p>No tenemos horarios disponibles ese día. Puedes elegir otra fecha.</p>
          )}
        </>}
      </>}
      {bookingMode === "confirm" && selectedSlot && <>
        <h3>Confirma tu reunión</h3>
        <p>¿Confirmamos tu reunión para el {bookingDateLabel(selectedSlot.start)} a las {bookingTimeLabel(selectedSlot.start)}?</p>
        <p className={styles.hint}>30 minutos · Hora de Lima · Google Meet</p>
        <p className={styles.hint}>Enviaremos la invitación a {bookingEmail}.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => void confirmBooking()} disabled={bookingLoading} tabIndex={tabIndex}>{bookingLoading ? "Confirmando reunión…" : "Confirmar reunión"}</button>
          <button type="button" onClick={() => void loadSlots(selectedDate)} disabled={bookingLoading} tabIndex={tabIndex}>Cambiar horario</button>
        </div>
      </>}
      {error && <p id={`${emailId}-error`} role="alert" className={styles.error}>{error}</p>}
      {bookingMode === "dates" && error && <button type="button" onClick={() => void loadSlots(selectedDate)} tabIndex={tabIndex}>Intentar nuevamente</button>}
      {!["offer", "conversation"].includes(bookingMode) && <button type="button" className={styles.textButton} onClick={keepTalking} disabled={bookingLoading} tabIndex={tabIndex}>Seguir conversando</button>}
    </>}
  </section>;
}
