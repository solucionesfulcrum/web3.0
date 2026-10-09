"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLanguage } from "../i18n/LanguageProvider";

type Message = { role: "user" | "advisor"; text: string };

export default function SalesAdvisor() {
  const { language } = useLanguage();
  const es = language === "es";
  const [docked, setDocked] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const launcher = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const hero = document.getElementById("capabilities");
      const end = hero ? hero.getBoundingClientRect().top + window.scrollY : innerHeight;
      setDocked(window.scrollY >= end * 0.98);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (!docked) setOpen(false);
  }, [docked]);
  useEffect(() => { if (open) closeButton.current?.focus({ preventScroll: true }); }, [open]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages, open]);

  const close = () => {
    setOpen(false);
    launcher.current?.focus({ preventScroll: true });
  };
  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages(current => [...current, { role: "user", text: text.trim() }, {
      role: "advisor",
      text: es
        ? "Gracias por compartir tu idea. Esta es una vista de demostración del asesor. Para conversar con nuestro equipo sobre tu proyecto, usa el botón de contacto de abajo."
        : "Thanks for sharing your idea. This is a preview of our advisor. To discuss your project with our team, use the contact button below.",
    }]);
    setDraft("");
  };
  const submit = (event: FormEvent) => { event.preventDefault(); send(draft); };
  const choices = es ? ["Agentes de IA", "Software a medida", "Automatizar mi negocio"] : ["AI agents", "Custom software", "Automate my business"];

  return <>
    <button ref={launcher} type="button" className="advisor-launcher" data-visible={docked}
      tabIndex={docked ? 0 : -1} aria-hidden={!docked}
      aria-label={es ? "Abrir asesor de ventas" : "Open sales advisor"}
      aria-expanded={open} aria-controls="sales-advisor" onClick={() => open ? close() : setOpen(true)}>
      <span className="advisor-launcher-label">{es ? "Hablemos" : "Let's talk"}</span>
      <span className="advisor-launcher-dot" aria-hidden="true" />
    </button>
    {open && docked && <section id="sales-advisor" className="advisor-panel" role="dialog" aria-labelledby="advisor-title"
      onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
      <header className="advisor-header">
        <span className="advisor-avatar" aria-hidden="true">f<span>.</span></span>
        <div><h2 id="advisor-title">{es ? "Asesor Fulcrum" : "Fulcrum advisor"}</h2><p>{es ? "DE LA IDEA A TU PRÓXIMO PROYECTO" : "FROM IDEA TO YOUR NEXT PROJECT"}</p></div>
        <button ref={closeButton} type="button" onClick={close} aria-label={es ? "Cerrar chat" : "Close chat"}>×</button>
      </header>
      <div className="advisor-preview">{es ? "VISTA PREVIA · CONVERSACIÓN DE DEMOSTRACIÓN" : "PREVIEW · DEMO CONVERSATION"}</div>
      <div ref={log} className="advisor-messages" role="log" aria-live="polite" aria-relevant="additions" aria-label={es ? "Conversación" : "Conversation"}>
        <div className="advisor-message" data-role="advisor"><span>FULCRUM</span><p>{es ? "Hola, soy tu asesor Fulcrum. ¿Qué te gustaría construir?" : "Hi, I'm your Fulcrum advisor. What would you like to build?"}</p></div>
        <div className="advisor-choices">{choices.map(choice => <button type="button" key={choice} onClick={() => send(choice)}>{choice}<span aria-hidden="true">↗</span></button>)}</div>
        {messages.map((message, index) => <div className="advisor-message" data-role={message.role} key={index}><span>{message.role === "advisor" ? "FULCRUM" : es ? "TÚ" : "YOU"}</span><p>{message.text}</p></div>)}
      </div>
      <a className="advisor-contact" href="#contact" onClick={() => setOpen(false)}>{es ? "Contactar al equipo" : "Contact our team"}<span aria-hidden="true">↗</span></a>
      <form className="advisor-compose" onSubmit={submit}>
        <input aria-label={es ? "Tu mensaje" : "Your message"} placeholder={es ? "Cuéntanos tu idea…" : "Tell us your idea…"} value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} />
        <button type="submit" disabled={!draft.trim()} aria-label={es ? "Enviar mensaje" : "Send message"}>↑</button>
      </form>
      <p className="advisor-footnote">{es ? "Demo: los mensajes no se envían al equipo." : "Demo: messages are not sent to our team."}</p>
    </section>}
  </>;
}
