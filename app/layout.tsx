import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FULCRUM — Intelligence Engineered Into Software",
  description: "AI agents, custom software and intelligent automation. FULCRUM designs and engineers the systems that move your business forward. Lima, Peru.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
