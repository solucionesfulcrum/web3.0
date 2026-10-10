"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import styles from "./FulcrumChat.module.css";

type Message = { role: "user" | "assistant"; text: string; isError?: boolean };
const historyLimit = 10;
const greeting = "Hola, soy el asistente IA de FULCRUM. ¿En qué podemos ayudarte hoy?";
const errorMessage = "No pudimos procesar tu consulta en este momento. Intenta nuevamente.";

export default function FulcrumChat() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [docked, setDocked] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: greeting }]);
  const launcher = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    const update = () => {
      const section = document.getElementById("capabilities");
      setDocked(!!section && window.scrollY >= (section.getBoundingClientRect().top + window.scrollY) * 0.98);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      request.current?.abort();
    };
  }, []);

  useEffect(() => { if (open) closeButton.current?.focus({ preventScroll: true }); }, [open]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, pending, open]);

  function close() {
    setOpen(false);
    launcher.current?.focus({ preventScroll: true });
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || request.current) return;
    // Capture previous turns before adding the current message, which is sent separately.
    const history = messages.filter(item => !item.isError).slice(-historyLimit)
      .map(item => ({ role: item.role, content: item.text }));
    const controller = new AbortController();
    request.current = controller;
    setMessages(current => [...current, { role: "user", text: message }]);
    setDraft("");
    setPending(true);
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 60000);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Chat request failed");
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !("reply" in data) || typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("Invalid chat response");
      }
      const reply = data.reply;
      setMessages(current => [...current, { role: "assistant", text: reply }]);
    } catch {
      if (!controller.signal.aborted || timedOut) {
        setMessages(current => [...current, { role: "assistant", text: errorMessage, isError: true }]);
      }
    } finally {
      window.clearTimeout(timeout);
      request.current = null;
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft);
  }

  return <div lang="es">
    <button ref={launcher} type="button" className={`advisor-launcher ${styles.launcher}`} data-visible="true"
      aria-label={open ? "Cerrar chat" : "Abrir chat de FULCRUM"} aria-expanded={open} aria-controls={id}
      onClick={() => open ? close() : setOpen(true)}>
      <span className="advisor-launcher-label">Hablemos <span className={styles.badge}>IA</span></span>
      <svg className={styles.launcherIcon} data-docked={docked} aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2Z" /><path d="M7 9h10M7 13h6" />
      </svg>
      <span className="advisor-launcher-dot" aria-hidden="true" />
    </button>
    <section id={id} className={`advisor-panel ${styles.panel}`} data-open={open} aria-hidden={!open}
      role="dialog" aria-labelledby={`${id}-title`}
      onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
      <header className="advisor-header">
        <span className="advisor-avatar" aria-hidden="true">f<span>.</span></span>
        <div><h2 id={`${id}-title`}>Asistente IA de FULCRUM</h2><p className={styles.status}><i aria-hidden="true" />En línea</p></div>
        <button ref={closeButton} type="button" onClick={close} aria-label="Cerrar chat" tabIndex={open ? 0 : -1}>×</button>
      </header>
      <div ref={log} className={`advisor-messages ${styles.messages}`} role="log" aria-live={open ? "polite" : "off"}
        aria-relevant="additions" aria-label="Conversación" tabIndex={open ? 0 : -1}>
        {messages.map((message, index) => <div className="advisor-message" data-role={message.role} key={index}>
          <span>{message.role === "user" ? "TÚ" : "FULCRUM"}</span><p>{message.text}</p>
        </div>)}
        {messages.length === 1 && <div className="advisor-choices">
          {["Agentes de IA", "Software a medida", "Automatizar mi negocio"].map(choice =>
            <button type="button" key={choice} tabIndex={open ? 0 : -1} disabled={pending} onClick={() => void send(choice)}>{choice}<span aria-hidden="true">↗</span></button>)}
        </div>}
        {pending && <div className={styles.typing} role="status"><span aria-hidden="true">● ● ●</span> Escribiendo…</div>}
      </div>
      <a className="advisor-contact" href="/#contact" tabIndex={open ? 0 : -1} onClick={close}>Contactar al equipo<span aria-hidden="true">↗</span></a>
      <form className={`advisor-compose ${styles.compose}`} onSubmit={submit}>
        <textarea aria-label="Tu mensaje" placeholder="Cuéntanos tu idea…" value={draft} rows={2} maxLength={2000}
          tabIndex={open ? 0 : -1} onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void send(draft);
            }
          }} />
        <button type="submit" disabled={pending || !draft.trim()} tabIndex={open ? 0 : -1} aria-label="Enviar mensaje">↑</button>
      </form>
      <p className="advisor-footnote">Impulsemos tu próximo proyecto.</p>
    </section>
  </div>;
}
