import { NextResponse } from "next/server";
import { taxesDb, validateTaxInput } from "@/lib/configurationData";

export async function GET(request, { params }) {
  const tax = taxesDb.getById(params.id);
  if (!tax) {
    return NextResponse.json({ message: "Tax not found" }, { status: 404 });
  }
  return NextResponse.json({ tax }, { status: 200 });
}

export async function PUT(request, { params }) {
  try {
    const payload = await request.json();
    const error = validateTaxInput(payload);
    if (error) {
      return NextResponse.json({ message: error }, { status: 400 });
    }

    const tax = taxesDb.update(params.id, payload);
    if (!tax) {
      return NextResponse.json({ message: "Tax not found" }, { status: 404 });
    }

    return NextResponse.json({ tax }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const removed = taxesDb.remove(params.id);
  if (!removed) {
    return NextResponse.json({ message: "Tax not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true }, { status: 200 });
}
