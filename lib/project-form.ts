export const projectServices = {
  "AI agents": "Agentes de IA",
  "Custom software": "Software a medida",
  "Intelligent automation": "Automatización inteligente",
  "Data + integrations": "Datos e integraciones",
  "Let’s figure it out": "Por definir juntos",
} as const;

export function validEmail(value: string) {
  return value.length <= 254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(value);
}

export function validateProject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_INPUT");
  const input = value as Record<string, unknown>;
  const allowed = ["requestId", "name", "email", "company", "service", "requirement"];
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new Error("INVALID_INPUT");
  function field(key: string, max: number, optional = false, multiline = false) {
    const raw = input[key];
    if (optional && raw === undefined) return "";
    if (typeof raw !== "string" || raw.length > max || (multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/).test(raw)) throw new Error("INVALID_INPUT");
    const text = raw.trim();
    if (!optional && !text) throw new Error("INVALID_INPUT");
    return text;
  }
  const requestId = field("requestId", 36);
  const name = field("name", 100);
  const email = field("email", 254);
  const company = field("company", 160, true) || null;
  const service = field("service", 80);
  const requirement = field("requirement", 4000, false, true);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId) || !validEmail(email) || !Object.hasOwn(projectServices, service)) throw new Error("INVALID_INPUT");
  return { requestId: `project-form:${requestId.toLowerCase()}`, name, email, company, service: projectServices[service as keyof typeof projectServices], requirement, source: "project-form", status: "NUEVO" };
}

export type ProjectLead = ReturnType<typeof validateProject> & { id: number; createdAt: Date };
