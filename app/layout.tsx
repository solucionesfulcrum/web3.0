import type { Metadata } from "next";
import "./globals.css";
import LanguageProvider from "@/components/i18n/LanguageProvider";

export const metadata: Metadata = {
  title: "FULCRUM — Intelligence Engineered Into Software",
  description: "AI agents, custom software and intelligent automation. FULCRUM designs and engineers the systems that move your business forward. Lima, Peru.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body><LanguageProvider>{children}</LanguageProvider></body></html>;
}
