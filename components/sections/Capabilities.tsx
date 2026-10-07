"use client";

import { useLanguage } from "../i18n/LanguageProvider";
import SectionIndex from "../ui/SectionIndex";

const capabilities = [
  ["AI AGENTS", "Autonomous agents designed around real business workflows.", "REASON · ACT · ADAPT"],
  ["CUSTOM SOFTWARE", "Software engineered specifically around the organization.", "ARCHITECT · BUILD · SCALE"],
  ["INTELLIGENT AUTOMATION", "Connect systems, decisions and operations.", "CONNECT · ORCHESTRATE · EXECUTE"],
  ["DATA + INTEGRATIONS", "Connect APIs, platforms, databases and AI.", "UNIFY · UNDERSTAND · ACTIVATE"],
];

export default function Capabilities() {
  const { t } = useLanguage();
  return <section id="capabilities" className="chapter capabilities" aria-labelledby="capabilities-title">
    <SectionIndex number="02">{t("CAPABILITIES")}</SectionIndex>
    <div className="section-intro">
      <h2 id="capabilities-title" data-reveal>{t("INTELLIGENCE")}<br />{t("BUILT INTO")}<br /><span className="muted-heading">{t("EVERYTHING.")}</span></h2>
      <p className="intro-note" data-reveal>{t("Not an add-on.")}<br />{t("An integral part of how")}<br />{t("your business works.")}</p>
    </div>
    <div className="capability-list">
      {capabilities.map(([title, description, detail], index) => <a className="capability-row" key={title} href="#contact" data-reveal style={{ "--reveal-delay": `${index * 45}ms` } as React.CSSProperties}>
        <span className="row-index">0{index + 1}</span>
        <h3>{t(title)}</h3>
        <span className="capability-description">{t(description)}<span className="capability-detail">{t(detail)}</span></span>
        <span className="row-arrow" aria-hidden="true">↗</span>
      </a>)}
    </div>
    <div className="section-footnote"><span>{t("PURPOSE-BUILT SYSTEMS")}</span><span>{t("ONE CONNECTED FOUNDATION.")}</span></div>
  </section>;
}
