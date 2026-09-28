import SectionIndex from "../ui/SectionIndex";

export default function AgentNetwork() {
  return <section id="agents" className="chapter agents" aria-labelledby="agents-title">
    <SectionIndex number="03">AGENT NETWORK</SectionIndex>
    <div className="agent-layout">
      <div className="agent-copy">
        <h2 id="agents-title" data-reveal>ONE CORE.<br /><span className="accent">MANY<br />AGENTS.</span></h2>
        <p className="section-description" data-reveal>Autonomous intelligence connected to the systems that run your business.</p>
        <p className="technical-note" data-reveal>A SHARED CONTEXT.<br />A COORDINATED RESPONSE.</p>
      </div>
      <div className="agent-diagram" data-reveal role="img" aria-label="Fulcrum core coordinates operations, knowledge, and workflow agents connected to business systems.">
        <div className="diagram-heading"><span>ORCHESTRATION LAYER</span><span className="system-status"><i />CONNECTED</span></div>
        <div className="diagram-field">
          <svg className="agent-connections" viewBox="0 0 500 350" preserveAspectRatio="none" aria-hidden="true">
            <path d="M140 175 H225 V65 H340 M225 175 H340 M225 175 V285 H340" />
            <path className="connection-pulse" d="M140 175 H225 V65 H340 M225 175 H340 M225 175 V285 H340" />
          </svg>
          <div className="diagram-core"><span>F / CORE</span><strong>FULCRUM</strong><span>SHARED INTELLIGENCE</span></div>
          <div className="agent-node node-one"><span>AGENT / 01</span><strong>OPERATIONS</strong><i /></div>
          <div className="agent-node node-two"><span>AGENT / 02</span><strong>KNOWLEDGE</strong><i /></div>
          <div className="agent-node node-three"><span>AGENT / 03</span><strong>WORKFLOWS</strong><i /></div>
        </div>
        <div className="diagram-systems"><span>BUSINESS SYSTEMS</span><span>APIs</span><span>DATA</span><span>PLATFORMS</span></div>
      </div>
    </div>
    <div className="section-footnote"><span>DESIGNED TO WORK TOGETHER</span><span>HUMAN DIRECTION. AUTONOMOUS EXECUTION.</span></div>
  </section>;
}
