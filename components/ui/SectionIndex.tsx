export default function SectionIndex({ number, children }: { number: string; children: React.ReactNode }) {
  return <div className="section-index" data-reveal><span className="index-tick" />{number} / {children}</div>;
}
