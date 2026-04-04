import { NextResponse } from "next/server";
import { invoicesDb } from "@/lib/invoiceData";

export async function GET(request) {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");
  const invoices = customerId
    ? invoicesDb.list().filter((item) => String(item.customerId || item.customer_id || "") === String(customerId))
    : invoicesDb.list();
  return NextResponse.json({ invoices }, { status: 200 });
}
