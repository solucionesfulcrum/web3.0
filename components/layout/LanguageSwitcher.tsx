"use client";

import { useLanguage } from "../i18n/LanguageProvider";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return <div className="language-switcher" role="group" aria-label={language === "es" ? "Idioma" : "Language"}>
    <button type="button" lang="es" title="Español" aria-label="Español" aria-pressed={language === "es"} onClick={() => setLanguage("es")}>
      <svg viewBox="0 0 30 20" aria-hidden="true"><path fill="#d91023" d="M0 0h30v20H0z" /><path fill="#fff" d="M10 0h10v20H10z" /></svg><span>ES</span>
    </button>
    <button type="button" lang="en" title="English" aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>
      <svg viewBox="0 0 30 20" aria-hidden="true"><path fill="#fff" d="M0 0h30v20H0z" /><path stroke="#b22234" strokeWidth="1.54" d="M0 .77h30M0 3.85h30M0 6.92h30M0 10h30M0 13.08h30M0 16.15h30M0 19.23h30" /><path fill="#3c3b6e" d="M0 0h13v10.77H0z" /><path stroke="#fff" strokeWidth="1" strokeDasharray="1 2" d="M2 2h9M3 4h8M2 6h9M3 8h8" /></svg><span>EN</span>
    </button>
  </div>;
}
