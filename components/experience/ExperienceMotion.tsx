"use client";

import { createContext, useContext, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";

export const CHAPTERS = ["core", "capabilities", "business", "agents", "engineering", "team", "contact"] as const;
export type MotionState = {
  heroProgress: number;
  chapter: number;
  engineeringProgress: number;
  pointerX: number;
  pointerY: number;
  reducedMotion: boolean;
};

const initialMotion: MotionState = {
  heroProgress: 0, chapter: 0, engineeringProgress: 0,
  pointerX: 0, pointerY: 0, reducedMotion: false,
};
const ExperienceContext = createContext<{
  motion: MutableRefObject<MotionState>;
  compact: boolean;
  reducedMotion: boolean;
} | null>(null);

export function useExperienceMotion() {
  const value = useContext(ExperienceContext);
  if (!value) throw new Error("ExperienceMotionProvider is required");
  return value;
}

export default function ExperienceMotionProvider({ children }: { children: ReactNode }) {
  const motion = useRef<MotionState>({ ...initialMotion });
  const [compact, setCompact] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let offsets: number[] = [];
    let frame = 0;
    const stages = document.querySelectorAll<HTMLElement>("[data-stage]");
    const chapterLinks = document.querySelectorAll<HTMLElement>("[data-chapter-link]");
    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      motion.current.heroProgress = clamp(y / Math.max(1, offsets[1] ?? innerHeight));
      let chapter = 0;
      for (let i = offsets.length - 1; i >= 0; i--) {
        if (y + innerHeight * 0.4 >= offsets[i]) { chapter = i; break; }
      }
      motion.current.chapter = chapter;
      motion.current.engineeringProgress = clamp((y - offsets[4] + innerHeight * 0.3) / Math.max(1, (offsets[5] - offsets[4]) * 0.75));
      document.documentElement.dataset.chapter = String(chapter);
      document.documentElement.style.setProperty("--journey-progress", String(clamp(y / Math.max(1, document.documentElement.scrollHeight - innerHeight))));
      document.documentElement.style.setProperty("--engineering-progress", String(motion.current.engineeringProgress));
      chapterLinks.forEach((link, index) => {
        if (index === chapter) link.setAttribute("aria-current", "step");
        else link.removeAttribute("aria-current");
      });
      stages.forEach((stage, index) => {
        stage.dataset.active = String(motion.current.engineeringProgress * 5 >= index);
      });
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measure = () => {
      offsets = CHAPTERS.map(id => (document.getElementById(id)?.getBoundingClientRect().top ?? 0) + scrollY);
      update();
    };
    const syncPreferences = () => {
      setCompact(mobileQuery.matches);
      setReducedMotion(motionQuery.matches);
      motion.current.reducedMotion = motionQuery.matches;
      if (motionQuery.matches) { motion.current.pointerX = 0; motion.current.pointerY = 0; }
    };
    const onPointer = (event: PointerEvent) => {
      if (motion.current.reducedMotion || event.pointerType === "touch") return;
      motion.current.pointerX = event.clientX / innerWidth * 2 - 1;
      motion.current.pointerY = -(event.clientY / innerHeight * 2 - 1);
    };
    const resetPointer = () => { motion.current.pointerX = 0; motion.current.pointerY = 0; };
    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.setAttribute("data-visible", "true");
        reveal.unobserve(entry.target);
      }
    }, { threshold: 0.12 });
    document.querySelectorAll("[data-reveal]").forEach(element => reveal.observe(element));
    document.documentElement.dataset.enhanced = "true";
    const resizeObserver = new ResizeObserver(measure);
    const main = document.querySelector("main");
    if (main) resizeObserver.observe(main);
    syncPreferences();
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", resetPointer);
    mobileQuery.addEventListener("change", syncPreferences);
    motionQuery.addEventListener("change", syncPreferences);
    return () => {
      cancelAnimationFrame(frame);
      reveal.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", resetPointer);
      mobileQuery.removeEventListener("change", syncPreferences);
      motionQuery.removeEventListener("change", syncPreferences);
      delete document.documentElement.dataset.enhanced;
    };
  }, []);

  return <ExperienceContext.Provider value={{ motion, compact, reducedMotion }}>{children}</ExperienceContext.Provider>;
}
