"use client";

import { useLanguage } from "../i18n/LanguageProvider";
import LanguageSwitcher from "./LanguageSwitcher";
export default function Navigation() {
  const { t } = useLanguage();
  return <>
    <a className="skip-link" href="#main">{t("Skip to content")}</a>
    <header className="navigation">
      <a className="wordmark" href="#core" aria-label={t("FULCRUM home")}>FULCRUM<span className="brand-period">.</span></a>
      <span className="nav-descriptor">{t("INDEPENDENT SOFTWARE ENGINEERING")}</span>
      <nav aria-label={t("Main navigation")}>
        <a href="#capabilities">{t("CAPABILITIES")}</a>
        <a href="#business" className="nav-business">{t("BUSINESS")}</a>
        <a href="#team">{t("TEAM")}</a>
        <a href="#contact" className="nav-contact">{t("CONTACT")} <span aria-hidden="true">↗</span></a>
        <LanguageSwitcher />
      </nav>
    </header>
    <div className="journey-meter" aria-hidden="true"><span /></div>
    <nav className="chapter-navigation" aria-label={t("Chapters")}>
      {[["core", "AI core"], ["capabilities", "Capabilities"], ["business", "Business solutions"], ["agents", "Agent network"], ["engineering", "Engineering"], ["team", "Team"], ["contact", "Contact"]].map(([id, label], index) =>
        <a href={`#${id}`} key={id} data-chapter-link={index} aria-label={`${index + 1}. ${t(label)}`}><span>0{index + 1}</span></a>
      )}
    </nav>
  </>;
}
