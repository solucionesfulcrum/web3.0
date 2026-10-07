"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import spanish from "./es.json";

type Language = "en" | "es";
const translations: Record<string, string> = spanish;
const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: (text: string) => string;
} | null>(null);

export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>("es");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fulcrum-language");
      if (saved === "es" || saved === "en") updateLanguage(saved);
    } catch { /* Language switching also works without browser storage. */ }
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = (next: Language) => {
    updateLanguage(next);
    try { localStorage.setItem("fulcrum-language", next); } catch { /* Storage is optional. */ }
  };
  const t = (text: string) => language === "es" ? translations[text] ?? text : text;
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("LanguageProvider is required");
  return context;
}
