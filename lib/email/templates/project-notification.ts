import type { ProjectLead } from "../../project-form";
import { base, detail } from "./base";

export function projectNotification(lead: ProjectLead) {
  const subject = `Nuevo proyecto — ${lead.company || lead.name}`;
  const fields = [["NOMBRE", lead.name], ["EMAIL", lead.email], ["EMPRESA", lead.company || "No indicada"], ["SERVICIO", lead.service], ["DESCRIPCIÓN", lead.requirement], ["ID DEL LEAD", String(lead.id)], ["FECHA (UTC)", lead.createdAt.toISOString()], ["SOURCE", lead.source]];
  return { subject, html: base("Nueva solicitud de proyecto", `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${fields.map(([label, value]) => detail(label, value)).join("")}</table>`), text: `${subject}\n\n${fields.map(([label, value]) => `${label}: ${value}`).join("\n\n")}\n\nFULCRUM\nhttps://fulcrum.com.pe` };
}
