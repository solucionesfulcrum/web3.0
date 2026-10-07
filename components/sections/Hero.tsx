"use client";

import { useLanguage } from "../i18n/LanguageProvider";
import SectionIndex from "../ui/SectionIndex";

export default function Hero() {
  const { t } = useLanguage();
  return <section id="core" className="chapter hero" aria-labelledby="hero-title">
    <div className="hero-content">
      <div className="hero-eyebrow"><SectionIndex number="01">{t("AI CORE")}</SectionIndex><span className="system-status"><i />{t("ONLINE")}</span></div>
      <h1 id="hero-title" className="hero-title" data-reveal><span>{t("WE BUILD")}</span><span>{t("SYSTEMS THAT")}</span><span className="accent">{t("THINK.")}</span></h1>
      <p className="hero-services" data-reveal>{t("AI AGENTS")} <b>·</b> {t("CUSTOM SOFTWARE")}<br className="mobile-break" /> <b>·</b> {t("INTELLIGENT AUTOMATION")}</p>
      <a className="project-link" href="#contact" data-reveal>{t("START A PROJECT")} <span aria-hidden="true">↗</span></a>
    </div>
    <aside className="core-caption" aria-label={t("Intelligence engineered into software")}>
      <span className="core-caption-index">01 <span>{t("AI CORE")}</span></span>
      <p>{t("INTELLIGENCE")}<br />{t("ENGINEERED")}<br />{t("INTO SOFTWARE")}</p>
      <span className="caption-coordinate">{t("F / 001 — ACTIVE")}</span>
    </aside>
    <div className="hero-bottom">
      <a className="scroll-cue" href="#capabilities">{t("SCROLL TO ENTER")} <span aria-hidden="true">↓</span></a>
      <span className="hero-location">{t("ENGINEERED IN LIMA. BUILT FOR WHAT'S NEXT.")}</span>
      <span className="hero-version">{t("EST. FOR THE FUTURE")}</span>
    </div>
  </section>;
}
