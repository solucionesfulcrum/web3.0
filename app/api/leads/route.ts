import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fields = [
  "name",
  "company",
  "email",
  "phone",
  "service",
  "requirement",
  "aiSummary",
  "source",
  "status",
] as const;

function saveError(status: number) {
  return NextResponse.json(
    { success: false, error: "No se pudo guardar el lead" },
    { status },
  );
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return saveError(400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return saveError(400);
    }

    const input = body as Record<string, unknown>;
    const requestId = input.requestId;
    if (requestId != null && (typeof requestId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))) {
      return saveError(400);
    }
    if (
      fields.some(
        (field) => input[field] != null && typeof input[field] !== "string",
      )
    ) {
      return saveError(400);
    }

    const data = {
      name: cleanString(input.name),
      company: cleanString(input.company),
      email: cleanString(input.email),
      phone: cleanString(input.phone),
      service: cleanString(input.service),
      requirement: cleanString(input.requirement),
      aiSummary: cleanString(input.aiSummary),
      source: cleanString(input.source) ?? "chatbot",
      status: cleanString(input.status) ?? "NUEVO",
    };

    if (!data.requirement || (!data.email && !data.phone)) {
      return saveError(400);
    }

    // The same conversation retries with the same key, even after a lost response.
    // PostgreSQL's unique index and native upsert also cover concurrent requests.
    const { source, status, ...contact } = data;
    const updates = Object.fromEntries(Object.entries(contact).filter(([, value]) => value !== null));
    const lead = typeof requestId === "string"
      ? await prisma.lead.upsert({ where: { requestId }, create: { ...data, requestId }, update: updates })
      : await prisma.lead.create({ data });
    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      // Never log the Prisma message, metadata or connection string: they may contain secrets.
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      console.error("[leads] Error de persistencia", {
        code: typeof code === "string" && /^(?:P\d{4}|[0-9A-Z]{5}|ECONNREFUSED|ETIMEDOUT|ECONNRESET)$/.test(code) ? code : "UNKNOWN",
      });
    }
    return saveError(500);
  }
}

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(
      { success: true, leads },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "No se pudieron obtener los leads" },
      { status: 500 },
    );
  }
}
