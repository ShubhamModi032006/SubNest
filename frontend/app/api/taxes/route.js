import { NextResponse } from "next/server";
import { taxesDb, validateTaxInput } from "@/lib/configurationData";

export async function GET() {
  return NextResponse.json({ taxes: taxesDb.list() }, { status: 200 });
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const error = validateTaxInput(payload);
    if (error) {
      return NextResponse.json({ message: error }, { status: 400 });
    }

    const tax = taxesDb.create(payload);
    return NextResponse.json({ tax }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
