import SectionIndex from "../ui/SectionIndex";

export default function Hero() {
  return <section id="core" className="chapter hero" aria-labelledby="hero-title">
    <div className="hero-content">
      <div className="hero-eyebrow"><SectionIndex number="01">AI CORE</SectionIndex><span className="system-status"><i />ONLINE</span></div>
      <h1 id="hero-title" className="hero-title" data-reveal><span>WE BUILD</span><span>SYSTEMS THAT</span><span className="accent">THINK.</span></h1>
      <p className="hero-services" data-reveal>AI AGENTS <b>·</b> CUSTOM SOFTWARE<br className="mobile-break" /> <b>·</b> INTELLIGENT AUTOMATION</p>
      <a className="project-link" href="#contact" data-reveal>START A PROJECT <span aria-hidden="true">↗</span></a>
    </div>
    <aside className="core-caption" aria-label="Intelligence engineered into software">
      <span className="core-caption-index">01 <span>AI CORE</span></span>
      <p>INTELLIGENCE<br />ENGINEERED<br />INTO SOFTWARE</p>
      <span className="caption-coordinate">F / 001 — ACTIVE</span>
    </aside>
    <div className="hero-bottom">
      <a className="scroll-cue" href="#capabilities">SCROLL TO ENTER <span aria-hidden="true">↓</span></a>
      <span className="hero-location">ENGINEERED IN LIMA. BUILT FOR WHAT&apos;S NEXT.</span>
      <span className="hero-version">EST. FOR THE FUTURE</span>
    </div>
  </section>;
}
