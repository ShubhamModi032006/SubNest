import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const id = params.id;
  return NextResponse.json({ 
    product: { 
      id, 
      name: "Mock Product " + id, 
      type: "Goods", 
      salesPrice: 100, 
      costPrice: 40,
      tax: "Zero",
      status: "active",
      recurringPrices: [],
      variants: [],
      created_at: new Date().toISOString() 
    } 
  }, { status: 200 });
}

export async function PUT(req, { params }) {
  const id = params.id;
  const body = await req.json();
  return NextResponse.json({ product: { id, status: "active", ...body } }, { status: 200 });
}

export async function DELETE(req, { params }) {
  return NextResponse.json({ success: true }, { status: 200 });
}
