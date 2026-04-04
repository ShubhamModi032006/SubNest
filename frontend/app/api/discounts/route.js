import { NextResponse } from "next/server";
import { discountsDb, validateDiscountInput } from "@/lib/configurationData";

export async function GET() {
  return NextResponse.json({ discounts: discountsDb.list() }, { status: 200 });
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const error = validateDiscountInput(payload);
    if (error) {
      return NextResponse.json({ message: error }, { status: 400 });
    }

    const discount = discountsDb.create(payload);
    return NextResponse.json({ discount }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
