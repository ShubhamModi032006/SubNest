import { NextResponse } from "next/server";
import { invoicesDb } from "@/lib/invoiceData";

export async function GET() {
  return NextResponse.json({ invoices: invoicesDb.list() }, { status: 200 });
}
