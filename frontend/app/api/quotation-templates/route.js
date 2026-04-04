import { NextResponse } from "next/server";
import { quotationTemplatesDb } from "@/lib/quotationTemplateData";

export async function GET() {
  return NextResponse.json({ templates: quotationTemplatesDb.list() }, { status: 200 });
}

export async function POST(request) {
  try {
    const payload = await request.json();
    if (!payload.name?.trim()) {
      return NextResponse.json({ message: "Template name is required." }, { status: 400 });
    }
    if (!payload.recurringPlanId) {
      return NextResponse.json({ message: "Recurring plan is required." }, { status: 400 });
    }

    const template = quotationTemplatesDb.create(payload);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
