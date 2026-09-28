export default function Navigation() {
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="navigation">
      <a className="wordmark" href="#core" aria-label="FULCRUM home">FULCRUM<span className="brand-period">.</span></a>
      <span className="nav-descriptor">INDEPENDENT SOFTWARE ENGINEERING</span>
      <nav aria-label="Main navigation">
        <a href="#capabilities">CAPABILITIES</a>
        <a href="#contact" className="nav-contact">CONTACT <span aria-hidden="true">↗</span></a>
      </nav>
    </header>
    <div className="journey-meter" aria-hidden="true"><span /></div>
    <nav className="chapter-navigation" aria-label="Chapters">
      {[["core", "AI core"], ["capabilities", "Capabilities"], ["agents", "Agent network"], ["engineering", "Engineering"], ["contact", "Contact"]].map(([id, label], index) =>
        <a href={`#${id}`} key={id} data-chapter-link={index} aria-label={`${index + 1}. ${label}`}><span>0{index + 1}</span></a>
      )}
    </nav>
  </>;
}
