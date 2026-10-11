export const statuses = ["NUEVO", "CONTACTADO", "PROPUESTA", "GANADO", "PERDIDO"] as const;
export type Lead = {
  id: number;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  service: string | null;
  requirement: string | null;
  aiSummary: string | null;
  source: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export function isLead(value: unknown): value is Lead {
  if (!value || typeof value !== "object") return false;
  const lead = value as Record<string, unknown>;
  return typeof lead.id === "number"
    && ["name", "company", "email", "phone", "service", "requirement", "aiSummary"].every(key => lead[key] === null || typeof lead[key] === "string")
    && ["source", "status", "createdAt", "updatedAt"].every(key => typeof lead[key] === "string");
}

export function formatDate(value: string, full = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric", month: full ? "long" : "short", year: "numeric",
    ...(full ? { hour: "2-digit", minute: "2-digit" } as const : {}),
    timeZone: "America/Lima",
  }).format(date);
}

export const searchText = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
