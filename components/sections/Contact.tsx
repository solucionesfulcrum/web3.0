"use client";

import { useRef, useState, type FormEvent } from "react";
import SectionIndex from "../ui/SectionIndex";

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function Contact() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [prepared, setPrepared] = useState(false);
  function prepareBrief(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const brief = ["FULCRUM — PROJECT BRIEF", "", `Name: ${data.get("name")}`, `Email: ${data.get("email")}`, `Organization: ${data.get("company") || "—"}`, `Area: ${data.get("service")}`, "", "Project:", String(data.get("project"))].join("\n");
    if (contactEmail) {
      window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(`New project — ${data.get("company") || data.get("name")}`)}&body=${encodeURIComponent(brief)}`;
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
    <SectionIndex number="05">CONTACT</SectionIndex>
    <h2 id="contact-title" data-reveal>READY TO BUILD<br />SOMETHING<br /><span className="accent">INTELLIGENT?</span></h2>
    <button className="contact-cta" onClick={() => { setPrepared(false); dialog.current?.showModal(); }} data-reveal>START A PROJECT <span aria-hidden="true">↗</span></button>
    <div className="contact-note" data-reveal><span className="index-tick" /><p>YOUR NEXT CHAPTER<br />STARTS WITH A CONVERSATION.</p></div>
    <footer className="footer">
      <div><a className="wordmark" href="#core">FULCRUM<span className="brand-period">.</span></a><p lang="es">INTELIGENCIA Y SOLUCIONES<br />TECNOLÓGICAS S.R.L.</p></div>
      <span>LIMA · PERÚ</span>
      <a href="#core">BACK TO THE CORE <span aria-hidden="true">↑</span></a>
      <small>© {new Date().getFullYear()} FULCRUM</small>
    </footer>
    <dialog ref={dialog} className="project-dialog" aria-labelledby="project-dialog-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="dialog-content">
        <button className="dialog-close" aria-label="Close project brief" onClick={() => dialog.current?.close()}>×</button>
        <span className="section-index">F / NEW PROJECT</span>
        <h3 id="project-dialog-title">LET&apos;S BUILD<br /><span className="accent">WHAT&apos;S NEXT.</span></h3>
        <p className="dialog-description">Tell us what you have in mind. {contactEmail ? "We’ll prepare an email draft for you to send." : "Create a project brief you can download and share."}</p>
        <form onSubmit={prepareBrief}>
          <div className="form-pair"><label>Your name<input name="name" autoComplete="name" required maxLength={100} /></label><label>Work email<input name="email" type="email" autoComplete="email" required maxLength={200} /></label></div>
          <div className="form-pair"><label>Organization<input name="company" autoComplete="organization" maxLength={160} /></label><label>What are we building?<select name="service"><option>AI agents</option><option>Custom software</option><option>Intelligent automation</option><option>Data + integrations</option><option>Let’s figure it out</option></select></label></div>
          <label>A few words about your project<textarea name="project" rows={4} required maxLength={4000} placeholder="The challenge, the idea, or the system you want to improve." /></label>
          <button className="form-submit" type="submit">{contactEmail ? "OPEN EMAIL DRAFT" : "DOWNLOAD PROJECT BRIEF"} <span aria-hidden="true">↗</span></button>
          <p className="form-status" role="status">{prepared ? (contactEmail ? "Your email draft is ready in your email app. Send it there to start the conversation." : "Your brief has been downloaded. No information has been sent.") : "Your details stay in your browser until you choose to share them."}</p>
        </form>
      </div>
    </dialog>
  </section>;
}
