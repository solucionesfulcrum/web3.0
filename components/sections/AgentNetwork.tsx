"use client";

import { useLanguage } from "../i18n/LanguageProvider";
import SectionIndex from "../ui/SectionIndex";

export default function AgentNetwork() {
  const { t } = useLanguage();
  return <section id="agents" className="chapter agents" aria-labelledby="agents-title">
    <SectionIndex number="04">{t("AGENT NETWORK")}</SectionIndex>
    <div className="agent-layout">
      <div className="agent-copy">
        <h2 id="agents-title" data-reveal>{t("ONE CORE.")}<br /><span className="accent">{t("MANY")}<br />{t("AGENTS.")}</span></h2>
        <p className="section-description" data-reveal>{t("Autonomous intelligence connected to the systems that run your business.")}</p>
        <p className="technical-note" data-reveal>{t("A SHARED CONTEXT.")}<br />{t("A COORDINATED RESPONSE.")}</p>
      </div>
      <div className="agent-diagram" data-reveal role="img" aria-label={t("Fulcrum core coordinates operations, knowledge, and workflow agents connected to business systems.")}>
        <div className="diagram-heading"><span>{t("ORCHESTRATION LAYER")}</span><span className="system-status"><i />{t("CONNECTED")}</span></div>
        <div className="diagram-field">
          <svg className="agent-connections" viewBox="0 0 500 350" preserveAspectRatio="none" aria-hidden="true">
            <path d="M140 175 H225 V65 H340 M225 175 H340 M225 175 V285 H340" />
            <path className="connection-pulse" d="M140 175 H225 V65 H340 M225 175 H340 M225 175 V285 H340" />
          </svg>
          <div className="diagram-core"><span>{t("F / CORE")}</span><strong>FULCRUM</strong><span>{t("SHARED INTELLIGENCE")}</span></div>
          <div className="agent-node node-one"><span>{t("AGENT / 01")}</span><strong>{t("OPERATIONS")}</strong><i /></div>
          <div className="agent-node node-two"><span>{t("AGENT / 02")}</span><strong>{t("KNOWLEDGE")}</strong><i /></div>
          <div className="agent-node node-three"><span>{t("AGENT / 03")}</span><strong>{t("WORKFLOWS")}</strong><i /></div>
        </div>
        <div className="diagram-systems"><span>{t("BUSINESS SYSTEMS")}</span><span>APIs</span><span>{t("DATA")}</span><span>{t("PLATFORMS")}</span></div>
      </div>
    </div>
    <div className="section-footnote"><span>{t("DESIGNED TO WORK TOGETHER")}</span><span>{t("HUMAN DIRECTION. AUTONOMOUS EXECUTION.")}</span></div>
  </section>;
}
