import SectionIndex from "../ui/SectionIndex";

const stages = [
  ["DISCOVER", "Understand the system before writing the code.", "CONTEXT / CONSTRAINTS"],
  ["DESIGN", "Turn a business challenge into a clear architecture.", "STRUCTURE / EXPERIENCE"],
  ["BUILD", "Engineer, test and iterate with intention.", "CODE / VALIDATION"],
  ["DEPLOY", "Move confidently from development to production.", "RELEASE / OBSERVABILITY"],
  ["EVOLVE", "Learn from real use. Make the system better.", "FEEDBACK / CONTINUOUS IMPROVEMENT"],
];

export default function Engineering() {
  return <section id="engineering" className="chapter engineering" aria-labelledby="engineering-title">
    <SectionIndex number="04">ENGINEERING</SectionIndex>
    <div className="section-intro">
      <h2 id="engineering-title" data-reveal>FROM IDEA<br />TO <span className="muted-heading">PRODUCTION.</span></h2>
      <p className="intro-note" data-reveal>Precision at every stage.<br />Built to keep moving forward.</p>
    </div>
    <ol className="engineering-pipeline">
      {stages.map(([title, description, detail], index) => <li key={title} data-stage data-active="false" data-reveal style={{ "--reveal-delay": `${index * 55}ms` } as React.CSSProperties}>
        <div className="stage-marker"><span>0{index + 1}</span><i /></div>
        <h3>{title}</h3><p>{description}</p><span className="stage-detail">{detail}</span>
      </li>)}
    </ol>
    <div className="engineering-statement" data-reveal><span className="index-tick" /><p>COMPLEXITY, RESOLVED.<br /><span>INTELLIGENCE, ENGINEERED.</span></p><a href="#contact" aria-label="Discuss your project">LET&apos;S BUILD <span aria-hidden="true">↗</span></a></div>
  </section>;
}
