import { NextResponse } from "next/server";

export async function PATCH(req, { params }) {
  const id = params.id;
  // Soft disable
  return NextResponse.json({ product: { id, name: "Archived " + id, type: "Unknown", salesPrice: 0, costPrice: 0, status: "archived", recurringPrices: [], variants: [], created_at: new Date().toISOString() } }, { status: 200 });
}
