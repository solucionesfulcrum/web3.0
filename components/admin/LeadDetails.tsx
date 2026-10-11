"use client";

import { useEffect, useRef } from "react";
import { formatDate, statuses, type Lead } from "./leads";
import LeadStatus from "./LeadStatus";
import styles from "./Leads.module.css";

export default function LeadDetails({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = dialog.current;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="lead-detail-title" onCancel={onClose}
    onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <div className={styles.detailPanel}>
      <header className={styles.detailHeader}><span className={styles.eyebrow}>OPORTUNIDAD #{lead.id}</span><button autoFocus className={styles.close} onClick={onClose} aria-label="Cerrar detalle">×</button></header>
      <h2 id="lead-detail-title">{lead.name || "Sin registrar"}</h2>
      <p className={styles.detailCompany}>{lead.company || "Empresa sin registrar"}</p>
      <LeadStatus status={lead.status} />
      <section className={styles.detailSection}><h3>Información de contacto</h3><dl className={styles.detailGrid}>
        {[["ID", String(lead.id)], ["Nombre", lead.name], ["Empresa", lead.company], ["Email", lead.email], ["Teléfono", lead.phone], ["Servicio", lead.service]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Sin registrar"}</dd></div>)}
      </dl></section>
      <section className={styles.aiBox}><h3><span aria-hidden="true">✦</span> Resumen IA</h3><p>{lead.aiSummary || "Sin resumen disponible"}</p></section>
      <section className={styles.detailSection}><h3>Requerimiento</h3><p className={styles.fullText}>{lead.requirement || "Sin requerimiento registrado"}</p></section>
      <section className={styles.detailSection}><h3>Seguimiento</h3>
        <label className={styles.field} htmlFor="lead-status">Estado<select id="lead-status" value={lead.status} disabled aria-describedby="status-help">
          {!statuses.some(status => status === lead.status) && <option value={lead.status}>{lead.status || "Sin estado"}</option>}
          {statuses.map(status => <option key={status}>{status}</option>)}
        </select></label><p id="status-help" className={styles.help}>Solo lectura. El cambio de estado estará disponible próximamente.</p>
        <dl className={styles.detailGrid}><div><dt>Origen</dt><dd>{lead.source || "Sin registrar"}</dd></div><div><dt>Creado</dt><dd>{formatDate(lead.createdAt, true)}</dd></div><div><dt>Última actualización</dt><dd>{formatDate(lead.updatedAt, true)}</dd></div></dl>
        <p className={styles.help}>Fechas en horario de Lima.</p>
      </section>
    </div>
  </dialog>;
}
