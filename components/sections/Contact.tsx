"use client";

import { useRef, useState, type FormEvent } from "react";
import { useLanguage } from "../i18n/LanguageProvider";
import SectionIndex from "../ui/SectionIndex";

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function Contact() {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const [prepared, setPrepared] = useState(false);
  function prepareBrief(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const brief = [t("FULCRUM — PROJECT BRIEF"), "", `${t("Name")}: ${data.get("name")}`, `${t("Email")}: ${data.get("email")}`, `${t("Organization")}: ${data.get("company") || "—"}`, `${t("Area")}: ${t(String(data.get("service")))}`, "", t("Project:"), String(data.get("project"))].join("\n");
    if (contactEmail) {
      window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(`${t("New project")} — ${data.get("company") || data.get("name")}`)}&body=${encodeURIComponent(brief)}`;
    } else {
      const url = URL.createObjectURL(new Blob([brief], { type: "text/plain;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "fulcrum-project-brief.txt";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    setPrepared(true);
  }
  return <section id="contact" className="chapter contact" aria-labelledby="contact-title">
    <SectionIndex number="07">{t("CONTACT")}</SectionIndex>
    <h2 id="contact-title" data-reveal>{t("READY TO BUILD")}<br />{t("SOMETHING")}<br /><span className="accent">{t("INTELLIGENT?")}</span></h2>
    <button className="contact-cta" onClick={() => { setPrepared(false); dialog.current?.showModal(); }} data-reveal>{t("START A PROJECT")} <span aria-hidden="true">↗</span></button>
    <div className="contact-note" data-reveal><span className="index-tick" /><p>{t("YOUR NEXT CHAPTER")}<br />{t("STARTS WITH A CONVERSATION.")}</p></div>
    <footer className="footer">
      <div><a className="wordmark" href="#core">FULCRUM<span className="brand-period">.</span></a><p lang="es">INTELIGENCIA Y SOLUCIONES<br />TECNOLÓGICAS S.R.L.</p></div>
      <span>LIMA · PERÚ</span>
      <a href="#core">{t("BACK TO THE CORE")} <span aria-hidden="true">↑</span></a>
      <small>© {new Date().getFullYear()} FULCRUM</small>
    </footer>
    <dialog ref={dialog} className="project-dialog" aria-labelledby="project-dialog-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="dialog-content">
        <button className="dialog-close" aria-label={t("Close project brief")} onClick={() => dialog.current?.close()}>×</button>
        <span className="section-index">{t("F / NEW PROJECT")}</span>
        <h3 id="project-dialog-title">{t("LET'S BUILD")}<br /><span className="accent">{t("WHAT'S NEXT.")}</span></h3>
        <p className="dialog-description">{t("Tell us what you have in mind.")} {contactEmail ? t("We’ll prepare an email draft for you to send.") : t("Create a project brief you can download and share.")}</p>
        <form onSubmit={prepareBrief}>
          <div className="form-pair"><label>{t("Your name")}<input name="name" autoComplete="name" required maxLength={100} /></label><label>{t("Work email")}<input name="email" type="email" autoComplete="email" required maxLength={200} /></label></div>
          <div className="form-pair"><label>{t("Organization")}<input name="company" autoComplete="organization" maxLength={160} /></label><label>{t("What are we building?")}<select name="service"><option value="AI agents">{t("AI agents")}</option><option value="Custom software">{t("Custom software")}</option><option value="Intelligent automation">{t("Intelligent automation")}</option><option value="Data + integrations">{t("Data + integrations")}</option><option value="Let’s figure it out">{t("Let’s figure it out")}</option></select></label></div>
          <label>{t("A few words about your project")}<textarea name="project" rows={4} required maxLength={4000} placeholder={t("The challenge, the idea, or the system you want to improve.")} /></label>
          <button className="form-submit" type="submit">{contactEmail ? t("OPEN EMAIL DRAFT") : t("DOWNLOAD PROJECT BRIEF")} <span aria-hidden="true">↗</span></button>
          <p className="form-status" role="status">{prepared ? (contactEmail ? t("Your email draft is ready in your email app. Send it there to start the conversation.") : t("Your brief has been downloaded. No information has been sent.")) : t("Your details stay in your browser until you choose to share them.")}</p>
        </form>
      </div>
    </dialog>
  </section>;
}
