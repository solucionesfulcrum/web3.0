import type { ProjectLead } from "../../project-form";
import { base, detail, escapeHtml } from "./base";

export function projectConfirmation(lead: ProjectLead) {
  const subject = "FULCRUM — Hemos recibido tu proyecto";
  const summary = lead.requirement.length > 600 ? `${lead.requirement.slice(0, 600)}…` : lead.requirement;
  return {
    subject,
    html: base("Hemos recibido tu proyecto", `<p style="font-size:16px;line-height:1.8">Hola, ${escapeHtml(lead.name)}.</p><p style="color:#dddddd;font-size:15px;line-height:1.8">Gracias por escribirnos. Recibimos tu solicitud y el equipo de FULCRUM revisará la información para conocer mejor tu proyecto.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${lead.company ? detail("ORGANIZACIÓN", lead.company) : ""}${detail("TIPO DE PROYECTO", lead.service)}${detail("RESUMEN DE TU SOLICITUD", summary)}</table>`),
    text: `Hola, ${lead.name}.\n\nRecibimos tu solicitud. El equipo de FULCRUM revisará la información de tu proyecto.\n${lead.company ? `Organización: ${lead.company}\n` : ""}Tipo de proyecto: ${lead.service}\nResumen: ${summary}\n\nEquipo FULCRUM\nINTELIGENCIA Y SOLUCIONES TECNOLÓGICAS\nhttps://fulcrum.com.pe\ncontacto@fulcrum.com.pe`,
  };
}
