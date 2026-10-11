import { statuses } from "./leads";
import styles from "./Leads.module.css";

export default function LeadStatus({ status }: { status: string }) {
  const known = statuses.some(value => value === status);
  return <span className={styles.badge} data-status={known ? status : "OTRO"}><i aria-hidden="true" />{status || "Sin estado"}</span>;
}
