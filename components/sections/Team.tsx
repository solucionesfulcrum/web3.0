"use client";

import Image from "next/image";
import { useRef, useState, type UIEvent } from "react";
import { useLanguage } from "../i18n/LanguageProvider";
import SectionIndex from "../ui/SectionIndex";

const profiles = [
  { image: "/team/engineering-v7.png", title: "Ing. Kevin Arias", description: "Technical Lead", credential: "CIP: 290351", alt: "Portrait of Kevin Arias" },
  { image: "/team/design.png", title: "EXPERIENCE DESIGN", description: "Interfaces shaped around people and purpose.", credential: undefined, alt: "Editorial portrait representing experience design" },
];

export default function Team() {
  const { t } = useLanguage();
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const showProfile = (index: number) => {
    const item = track.current?.children[index] as HTMLElement | undefined;
    if (item && track.current) track.current.scrollTo({ left: item.offsetLeft - track.current.offsetLeft, behavior: "smooth" });
    setActive(index);
  };

  const syncActive = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const width = element.firstElementChild?.getBoundingClientRect().width ?? 1;
    setActive(Math.min(profiles.length - 1, Math.round(element.scrollLeft / width)));
  };

  return <section id="team" className="chapter team" aria-labelledby="team-title">
    <SectionIndex number="06">{t("OUR TEAM")}</SectionIndex>
    <div className="team-layout">
      <div className="team-copy" data-reveal>
        <p className="team-kicker">// {t("PEOPLE BEHIND THE WORK")}</p>
        <h2 id="team-title">{t("BUILT BY")}<br /><span className="accent">{t("PEOPLE.")}</span></h2>
        <p className="team-description">{t("Great technology starts with people who understand the problem. Design, engineering and human insight work together in every solution we build.")}</p>
        <ul className="team-principles">
          <li>{t("Human-centered thinking")}</li>
          <li>{t("Engineering from day one")}</li>
        </ul>
        <a className="team-cta" href="#contact">{t("LET'S WORK TOGETHER")} <span aria-hidden="true">↗</span></a>
      </div>
      <div className="team-showcase" data-reveal>
        <div className="team-showcase-top"><span>F / {t("THE TEAM")}</span><span>01 — 02</span></div>
        <div className="team-track" ref={track} onScroll={syncActive}>
          {profiles.map((profile, index) => <article className="team-card" key={profile.title}>
            <div className="team-image-wrap">
              <Image src={profile.image} alt={t(profile.alt)} fill sizes="(max-width: 767px) 80vw, (max-width: 1100px) 28vw, 22vw" className="team-image" />
              <span className="team-image-corner" aria-hidden="true" />
              <span className="team-card-index">0{index + 1} / 02</span>
            </div>
            <h3>{t(profile.title)}</h3>
            <p>{t(profile.description)}</p>
            {profile.credential && <p className="team-credential">{profile.credential}</p>}
          </article>)}
        </div>
        <div className="team-pagination" aria-label={t("Team profiles")}>{profiles.map((profile, index) => <button key={profile.title} type="button" onClick={() => showProfile(index)} aria-label={`${t("Show profile")} ${index + 1}`} aria-current={active === index ? "true" : undefined} />)}</div>
      </div>
    </div>
  </section>;
}
