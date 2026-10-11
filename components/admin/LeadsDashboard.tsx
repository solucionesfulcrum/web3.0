"use client";

import { useEffect, useMemo, useState } from "react";
import { isLead, searchText, statuses, type Lead } from "./leads";
import LeadStats from "./LeadStats";
import LeadTable from "./LeadTable";
import LeadDetails from "./LeadDetails";
import styles from "./Leads.module.css";

export default function LeadsDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const [selected, setSelected] = useState<Lead | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setError(false);
    async function load() {
      try {
        const response = await fetch("/api/leads", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Request failed");
        const data = await response.json();
        if (data?.success !== true || !Array.isArray(data.leads) || !data.leads.every(isLead)) throw new Error("Invalid response");
        if (active) setLeads(data.leads);
      } catch {
        if (active) setError(true);
      } finally {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [refresh]);

  const filtered = useMemo(() => {
    const term = searchText(query.trim());
    return leads.filter(lead => (status === "Todos" || lead.status === status)
      && [lead.name, lead.company, lead.email, lead.phone, lead.service, lead.requirement].some(value => searchText(value || "").includes(term)));
  }, [leads, query, status]);
  const clear = () => { setQuery(""); setStatus("Todos"); };

  return <>
    <div className={styles.heading}>
      <div><p className={styles.eyebrow}><span className={styles.orange}>●</span> PIPELINE COMERCIAL</p><h1>Leads <span>{loading || error ? "—" : leads.length}</span></h1><p className={styles.subtitle}>Oportunidades comerciales captadas desde FULCRUM</p></div>
      <button className={styles.button} onClick={() => setRefresh(value => value + 1)} disabled={loading}><span aria-hidden="true">↻</span> {loading ? "Actualizando…" : "Actualizar"}</button>
    </div>
    <LeadStats leads={leads} loading={loading || error} />
    <p className={styles.scope}>Resumen de los últimos 100 leads como máximo. Los filtros se aplican al listado cargado.</p>
    <section className={styles.list} aria-label="Listado de leads" aria-busy={loading}>
      <div className={styles.listTitle}><h2>Oportunidades</h2><span>VISTA GENERAL</span></div>
      <div className={styles.filters}>
        <label className={styles.search}>Buscar leads<input type="search" placeholder="Nombre, empresa, contacto o necesidad…" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <label className={styles.field}>Estado<select value={status} onChange={event => setStatus(event.target.value)}><option>Todos</option>{statuses.map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      {loading ? <div className={styles.empty} role="status"><span className={styles.loader} aria-hidden="true" /><h3>Cargando oportunidades</h3><p>Estamos obteniendo tus leads.</p></div>
        : error ? <div className={styles.empty} role="alert"><h3>No pudimos cargar los leads</h3><p>Intenta de nuevo en un momento.</p><button className={styles.button} onClick={() => setRefresh(value => value + 1)}>Reintentar</button></div>
        : leads.length === 0 ? <div className={styles.empty}><span className={styles.emptyIcon} aria-hidden="true">↗</span><h3>Tu próxima oportunidad empieza aquí</h3><p>Las solicitudes captadas por el chatbot aparecerán en este espacio.</p></div>
        : filtered.length === 0 ? <div className={styles.empty}><h3>No hay resultados</h3><p>Prueba otra búsqueda o cambia el estado.</p><button className={styles.button} onClick={clear}>Limpiar filtros</button></div>
        : <LeadTable leads={filtered} onSelect={setSelected} />}
      <footer className={styles.listFooter}><span role="status">{loading ? "Cargando…" : error ? "Datos no disponibles" : `${filtered.length} de ${leads.length} leads`}</span><span>Más recientes primero</span></footer>
    </section>
    {selected && <LeadDetails lead={selected} onClose={() => setSelected(null)} />}
  </>;
}
