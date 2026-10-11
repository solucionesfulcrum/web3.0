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

    if (!data.email && !data.phone && !data.requirement) {
      return saveError(400);
    }

    const lead = await prisma.lead.create({ data });
    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch {
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
