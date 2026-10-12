import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateProject } from "@/lib/project-form";
import { contactRecipient, sendMail } from "@/lib/email/mailer";
import { projectConfirmation } from "@/lib/email/templates/project-confirmation";
import { projectNotification } from "@/lib/email/templates/project-notification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let data: ReturnType<typeof validateProject>;
  try {
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply({ error: "Se requiere JSON." }, 415);
    // Bound the actual stream, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) throw new Error("INVALID_INPUT");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32768) { await reader.cancel(); return reply({ error: "Solicitud demasiado extensa." }, 413); }
      chunks.push(value);
    }
    data = validateProject(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch {
    return reply({ error: "Revisa el nombre, correo, servicio y descripción del proyecto." }, 400);
  }

  let lead;
  try {
    lead = await prisma.lead.create({ data });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      try {
        const existing = await prisma.lead.findUnique({ where: { requestId: data.requestId } });
        if (existing && ["name", "email", "company", "service", "requirement", "source"].every(key => existing[key as keyof typeof existing] === data[key as keyof typeof data])) {
          // Only the request that created the row sends mail. A retry cannot prove delivery.
          return reply({ success: true, leadSaved: true, duplicate: true, emails: { internal: "unknown", confirmation: "unknown" } }, 200);
        }
        return reply({ error: "Esta solicitud ya fue utilizada con otros datos. Abre un nuevo formulario." }, 409);
      } catch { /* Return the same safe persistence error below. */ }
    }
    console.error("[project-form] LEAD_SAVE_FAILED");
    return reply({ error: "No pudimos guardar la solicitud. Inténtalo nuevamente." }, 500);
  }

  const project = { ...data, id: lead.id, createdAt: lead.createdAt };
  async function deliver(kind: "internal" | "confirmation") {
    try {
      await sendMail(kind === "internal"
        ? { ...projectNotification(project), to: contactRecipient(), replyTo: data.email }
        : { ...projectConfirmation(project), to: data.email });
      return "sent";
    } catch {
      // Do not log error objects: SMTP responses can contain credentials and personal data.
      console.error("[project-form] EMAIL_FAILED", { leadId: project.id, kind });
      return "failed";
    }
  }
  const internal = await deliver("internal");
  const confirmation = await deliver("confirmation");
  return reply({ success: true, leadSaved: true, emails: { internal, confirmation } }, 201);
}
