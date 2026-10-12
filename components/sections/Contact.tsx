"use client";

import { useRef, useState, type FormEvent } from "react";
import { useLanguage } from "../i18n/LanguageProvider";
import { projectServices } from "@/lib/project-form";
import SectionIndex from "../ui/SectionIndex";

export default function Contact() {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const requestId = useRef<string | null>(null);
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [receipt, setReceipt] = useState({ name: "", email: "", confirmed: false });
  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || state === "success") return;
    const form = new FormData(event.currentTarget);
    busy.current = true;
    setState("submitting");
    try {
      requestId.current ??= crypto.randomUUID();
      const input = { requestId: requestId.current, name: String(form.get("name")).trim(), email: String(form.get("email")).trim(), company: String(form.get("company") || ""), service: form.get("service"), requirement: form.get("project") };
      const response = await fetch("/api/leads/project", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const result = await response.json();
      if (!response.ok || !result.leadSaved) throw new Error("REQUEST_FAILED");
      setReceipt({ name: input.name, email: input.email, confirmed: result.emails?.confirmation === "sent" });
      setState("success");
    } catch {
      setState("error");
    } finally {
      busy.current = false;
    }
  }
  function close() { if (!busy.current) dialog.current?.close(); }
  return <section id="contact" className="chapter contact" aria-labelledby="contact-title">
    <SectionIndex number="07">{t("CONTACT")}</SectionIndex>
    <h2 id="contact-title" data-reveal>{t("READY TO BUILD")}<br />{t("SOMETHING")}<br /><span className="accent">{t("INTELLIGENT?")}</span></h2>
    <button className="contact-cta" onClick={() => { if (state === "success") { setState("idle"); requestId.current = null; } dialog.current?.showModal(); }} data-reveal>{t("START A PROJECT")} <span aria-hidden="true">↗</span></button>
    <div className="contact-note" data-reveal><span className="index-tick" /><p>{t("YOUR NEXT CHAPTER")}<br />{t("STARTS WITH A CONVERSATION.")}</p></div>
    <footer className="footer">
      <div><a className="wordmark" href="#core">FULCRUM<span className="brand-period">.</span></a><p lang="es">INTELIGENCIA Y SOLUCIONES<br />TECNOLÓGICAS S.R.L.</p></div>
      <span>LIMA · PERÚ</span>
      <a href="#core">{t("BACK TO THE CORE")} <span aria-hidden="true">↑</span></a>
      <small>© {new Date().getFullYear()} FULCRUM</small>
    </footer>
    <dialog ref={dialog} className="project-dialog" aria-labelledby="project-dialog-title" onCancel={event => { if (busy.current) event.preventDefault(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="dialog-content">
        <button className="dialog-close" aria-label={t("Close project brief")} disabled={state === "submitting"} onClick={close}>×</button>
        <span className="section-index">{t("F / NEW PROJECT")}</span>
        {state === "success" ? <div role="status" aria-live="polite">
          <h3 id="project-dialog-title">{t("REQUEST RECEIVED")}</h3>
          <p className="dialog-description">{t("Thank you")}, {receipt.name}.<br />{t("We have received your project information.")}</p>
          <p className="form-status">{receipt.confirmed ? <>{t("We sent a confirmation to")} {receipt.email}.</> : t("Your request is saved. We could not confirm the email delivery; our team will review your project.")}</p>
          <button className="form-submit" type="button" onClick={close}>{t("CLOSE")}</button>
        </div> : <>
        <h3 id="project-dialog-title">{t("LET'S BUILD")}<br /><span className="accent">{t("WHAT'S NEXT.")}</span></h3>
        <p className="dialog-description">{t("Tell us what you have in mind.")} {t("Our team will review your project.")}</p>
        <form onSubmit={submitProject} aria-busy={state === "submitting"}>
          <div className="form-pair"><label>{t("Your name")}<input name="name" autoComplete="name" required maxLength={100} /></label><label>{t("Work email")}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label></div>
          <div className="form-pair"><label>{t("Organization")}<input name="company" autoComplete="organization" maxLength={160} /></label><label>{t("What are we building?")}<select name="service" required>{Object.keys(projectServices).map(service => <option key={service} value={service}>{t(service)}</option>)}</select></label></div>
          <label>{t("A few words about your project")}<textarea name="project" rows={4} required maxLength={4000} placeholder={t("The challenge, the idea, or the system you want to improve.")} /></label>
          <button className="form-submit" type="submit" disabled={state === "submitting"}>{t(state === "submitting" ? "SENDING REQUEST…" : "SEND REQUEST")} <span aria-hidden="true">↗</span></button>
          <p className="form-status" role={state === "error" ? "alert" : "status"}>{state === "error" ? t("We could not confirm receipt. Check your details and try again.") : t("Your information will be sent to FULCRUM to review your project.")}</p>
        </form>
        </>}
      </div>
    </dialog>
  </section>;
}
