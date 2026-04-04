import { NextResponse } from "next/server";
import { quotationTemplatesDb } from "@/lib/quotationTemplateData";

export async function GET(request, { params }) {
  const template = quotationTemplatesDb.getById(params.id);
  if (!template) {
    return NextResponse.json({ message: "Template not found" }, { status: 404 });
  }
  return NextResponse.json({ template }, { status: 200 });
}

export async function PUT(request, { params }) {
  try {
    const payload = await request.json();
    const template = quotationTemplatesDb.update(params.id, payload);
    if (!template) {
      return NextResponse.json({ message: "Template not found" }, { status: 404 });
    }
    return NextResponse.json({ template }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const removed = quotationTemplatesDb.remove(params.id);
  if (!removed) {
    return NextResponse.json({ message: "Template not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true }, { status: 200 });
}
