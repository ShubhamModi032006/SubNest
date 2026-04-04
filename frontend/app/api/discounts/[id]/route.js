import { NextResponse } from "next/server";
import { discountsDb, validateDiscountInput } from "@/lib/configurationData";

export async function GET(request, { params }) {
  const discount = discountsDb.getById(params.id);
  if (!discount) {
    return NextResponse.json({ message: "Discount not found" }, { status: 404 });
  }
  return NextResponse.json({ discount }, { status: 200 });
}

export async function PUT(request, { params }) {
  try {
    const payload = await request.json();
    const error = validateDiscountInput(payload);
    if (error) {
      return NextResponse.json({ message: error }, { status: 400 });
    }

    const discount = discountsDb.update(params.id, payload);
    if (!discount) {
      return NextResponse.json({ message: "Discount not found" }, { status: 404 });
    }

    return NextResponse.json({ discount }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const removed = discountsDb.remove(params.id);
  if (!removed) {
    return NextResponse.json({ message: "Discount not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true }, { status: 200 });
}
