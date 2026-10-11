import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/admin/Leads.module.css";

export const metadata: Metadata = {
  title: "Leads | FULCRUM",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Future server-side session checks belong here. API authorization must also be enforced separately.
  return <div className={styles.shell} lang="es">
    <a className="skip-link" href="#admin-content">Ir al contenido</a>
    <header className={styles.topbar}>
      <Link href="/" className="wordmark" aria-label="FULCRUM, inicio">fulcrum<span className="brand-period">.</span></Link>
      <span className={styles.workspace}>WORKSPACE <span>/</span> Comercial</span>
      <Link href="/" className={styles.back}>Ir al sitio <span aria-hidden="true">↗</span></Link>
    </header>
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <p className={styles.eyebrow}>ESPACIO DE TRABAJO</p>
        <nav aria-label="Administración"><Link href="/admin/leads" aria-current="page"><span aria-hidden="true">▦</span> Leads <span aria-hidden="true">↗</span></Link></nav>
        <p className={styles.sidebarNote}>Cada conversación.<br />Una nueva oportunidad.</p>
      </aside>
      <main id="admin-content" className={styles.main}>{children}</main>
    </div>
  </div>;
}
