import { formatDate, type Lead } from "./leads";
import LeadStatus from "./LeadStatus";
import styles from "./Leads.module.css";

export default function LeadTable({ leads, onSelect }: { leads: Lead[]; onSelect: (lead: Lead) => void }) {
  return <>
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>Leads comerciales. Abre el detalle desde el nombre del contacto.</caption>
        <thead><tr>{["Contacto / Empresa", "Email / Teléfono", "Servicio", "Estado", "Fecha", "Resumen IA"].map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead>
        <tbody>{leads.map(lead => <tr key={lead.id}>
          <td><button className={styles.leadButton} onClick={() => onSelect(lead)} aria-label={`Ver detalle de ${lead.name || lead.company || `lead ${lead.id}`}`}>
            <span className={styles.avatar} aria-hidden="true">{(lead.name || lead.company || "?").slice(0, 1).toUpperCase()}</span>
            <span><strong>{lead.name || "Sin registrar"}</strong><small>{lead.company || "Sin registrar"}</small></span>
          </button></td>
          <td><span>{lead.email || "Sin email"}</span><small>{lead.phone || "Sin teléfono"}</small></td>
          <td>{lead.service || "Sin clasificar"}</td>
          <td><LeadStatus status={lead.status} /></td>
          <td><time dateTime={lead.createdAt}>{formatDate(lead.createdAt)}</time></td>
          <td><p className={styles.summary}>{lead.aiSummary || "Sin resumen disponible"}</p></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className={styles.cards}>{leads.map(lead => <article className={styles.card} key={lead.id}>
      <div className={styles.cardHead}><div><h3>{lead.name || "Sin registrar"}</h3><p>{lead.company || "Sin registrar"}</p></div><LeadStatus status={lead.status} /></div>
      <dl><div><dt>Email</dt><dd>{lead.email || "Sin registrar"}</dd></div><div><dt>Teléfono</dt><dd>{lead.phone || "Sin registrar"}</dd></div><div><dt>Servicio</dt><dd>{lead.service || "Sin clasificar"}</dd></div></dl>
      <p className={styles.summary}>{lead.aiSummary || "Sin resumen disponible"}</p>
      <footer><time dateTime={lead.createdAt}>{formatDate(lead.createdAt)}</time><button className={styles.detailButton} onClick={() => onSelect(lead)} aria-label={`Ver detalle de ${lead.name || `lead ${lead.id}`}`}>Ver detalle <span aria-hidden="true">↗</span></button></footer>
    </article>)}</div>
  </>;
}
