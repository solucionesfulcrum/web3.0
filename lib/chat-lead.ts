export const leadServices = [
  "Desarrollo Web", "Software Personalizado", "Automatización",
  "Inteligencia Artificial", "Integraciones", "SaaS", "Otro",
] as const;

export type ChatLeadData = {
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  service: string | null;
  requirement: string | null;
  aiSummary: string | null;
  contactConsent: boolean;
  readyToCreate: boolean;
};

// Shared validation contains no server configuration or credentials.
export function normalizeChatLead(value: unknown): ChatLeadData {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const clean = (key: string, limit: number) =>
    typeof input[key] === "string" ? input[key].trim().slice(0, limit) || null : null;
  const email = clean("email", 254);
  const phone = clean("phone", 40);
  const service = clean("service", 60);
  const result: ChatLeadData = {
    name: clean("name", 150),
    company: clean("company", 200),
    email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
    phone: phone && /^[+\d\s().-]+$/.test(phone) && phone.replace(/\D/g, "").length >= 7
      && phone.replace(/\D/g, "").length <= 15 ? phone : null,
    service: leadServices.some(item => item === service) ? service : null,
    requirement: clean("requirement", 2000),
    aiSummary: clean("aiSummary", 600),
    contactConsent: input.contactConsent === true,
    readyToCreate: false,
  };
  result.readyToCreate = input.readyToCreate === true && result.contactConsent
    && !!result.requirement && !!(result.email || result.phone);
  return result;
}

const nullableString = { type: ["string", "null"] };
export const chatResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "leadData"],
  properties: {
    reply: { type: "string" },
    leadData: {
      type: "object",
      additionalProperties: false,
      required: ["name", "company", "email", "phone", "service", "requirement", "aiSummary", "contactConsent", "readyToCreate"],
      properties: {
        name: nullableString, company: nullableString, email: nullableString,
        phone: nullableString,
        service: { type: ["string", "null"], enum: [...leadServices, null] },
        requirement: nullableString, aiSummary: nullableString,
        contactConsent: { type: "boolean" }, readyToCreate: { type: "boolean" },
      },
    },
  },
};
