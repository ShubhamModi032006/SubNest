import { NextResponse } from "next/server";

// Sample mock logic keeping nested arrays for variants & prices.
let products = [
  { 
    id: "p1", 
    name: "Enterprise Support Agent", 
    type: "Service", 
    salesPrice: 200, 
    costPrice: 50, 
    tax: "Standard 20%",
    status: "active",
    recurringPrices: [
      { id: "rp1", plan: "Monthly Basic", price: 200, minQuantity: 1, startDate: "2026-01-01", endDate: "" }
    ],
    variants: [
      { id: "v1", attribute: "SLA", value: "24/7", extraPrice: 50 }
    ],
    created_at: new Date().toISOString() 
  }
];

export async function GET(req) {
  return NextResponse.json({ products }, { status: 200 });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const newProduct = {
      id: "p" + Date.now().toString(),
      status: "active",
      ...body,
      created_at: new Date().toISOString()
    };
    products.push(newProduct);
    return NextResponse.json({ product: newProduct }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
