import type { Lead } from "./leads";
import styles from "./Leads.module.css";

const metrics = [["NUEVO", "Nuevos"], ["CONTACTADO", "Contactados"], ["PROPUESTA", "Propuestas"], ["GANADO", "Ganados"]] as const;

export default function LeadStats({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  return <section className={styles.stats} aria-label="Resumen de oportunidades">
    {metrics.map(([status, label], index) => <article className={styles.stat} key={status}>
      <div><span>{label}</span><span className={styles.statIndex} aria-hidden="true">0{index + 1}</span></div>
      <strong>{loading ? "—" : leads.filter(lead => lead.status === status).length}</strong>
      <span className={styles.statNote}>{status === "GANADO" ? "Oportunidades convertidas" : "Oportunidades en seguimiento"}</span>
    </article>)}
  </section>;
}
