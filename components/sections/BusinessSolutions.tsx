"use client";

import Image from "next/image";
import { useRef, useState, type UIEvent } from "react";
import { useLanguage } from "../i18n/LanguageProvider";
import SectionIndex from "../ui/SectionIndex";

const solutions = [
  { image: "/business/strategy.png", category: "STRATEGY / DATA", title: "Clarity for better decisions", description: "Connect information and turn it into useful direction.", alt: "Professionals reviewing business strategy and data" },
  { image: "/business/operations.png", category: "OPERATIONS / AUTOMATION", title: "Operations that move together", description: "Unify teams, workflows and systems around the work.", alt: "Professionals collaborating around a laptop" },
  { image: "/business/innovation.png", category: "PRODUCTS / GROWTH", title: "New ideas, built to scale", description: "Create digital products ready for what comes next.", alt: "Professional exploring a digital data display" },
];

export default function BusinessSolutions() {
  const { t } = useLanguage();
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const showSolution = (index: number) => {
    const item = track.current?.children[index] as HTMLElement | undefined;
    if (item && track.current) track.current.scrollTo({ left: item.offsetLeft - track.current.offsetLeft, behavior: "smooth" });
    setActive(index);
  };

  const syncActive = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const item = element.firstElementChild as HTMLElement | null;
    const step = item ? item.getBoundingClientRect().width + 16 : 1;
    setActive(Math.min(solutions.length - 1, Math.round(element.scrollLeft / step)));
  };

  return <section id="business" className="chapter business" aria-labelledby="business-title">
    <SectionIndex number="03">{t("BUSINESS SOLUTIONS")}</SectionIndex>
    <div className="business-heading" data-reveal>
      <p className="business-kicker">// {t("WHAT WE BUILD FOR BUSINESS")}</p>
      <h2 id="business-title">{t("SOLUTIONS SHAPED")}<br /><span className="accent">{t("AROUND BUSINESS.")}</span></h2>
      <p>{t("From clearer decisions to connected operations and new digital products, we turn complex challenges into working systems.")}</p>
    </div>
    <div className="business-track" ref={track} onScroll={syncActive}>
      {solutions.map((solution, index) => <a className="business-card" href="#contact" key={solution.title} data-reveal style={{ "--reveal-delay": `${index * 65}ms` } as React.CSSProperties}>
        <div className="business-image-wrap">
          <Image src={solution.image} alt={t(solution.alt)} fill sizes="(max-width: 767px) 82vw, (max-width: 1100px) 29vw, 27vw" className="business-image" />
          <span className="business-card-number">0{index + 1} / 03</span>
        </div>
        <div className="business-card-content">
          <span className="business-category">{t(solution.category)}</span>
          <h3>{t(solution.title)}</h3>
          <p>{t(solution.description)}</p>
          <span className="business-card-arrow" aria-hidden="true">↗</span>
        </div>
      </a>)}
    </div>
    <div className="business-pagination" aria-label={t("Business solutions")}>{solutions.map((solution, index) => <button type="button" key={solution.title} onClick={() => showSolution(index)} aria-label={`${t("Show solution")} ${index + 1}`} aria-current={active === index ? "true" : undefined} />)}</div>
  </section>;
}
