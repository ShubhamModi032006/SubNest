import { NextResponse } from "next/server";
import { invoicesDb } from "@/lib/invoiceData";

export async function POST(request, { params }) {
  const invoice = invoicesDb.send(params.id);
  if (!invoice) {
    return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
  }
  return NextResponse.json({ invoice }, { status: 200 });
}
