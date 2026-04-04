import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const id = params.id;
  return NextResponse.json({ contact: { id, name: "Mock Contact " + id, email: "contact@example.com", phone: "000", address: "Mock Town", user_id: "1", created_at: new Date().toISOString() } }, { status: 200 });
}

export async function PUT(req, { params }) {
  const id = params.id;
  const body = await req.json();
  return NextResponse.json({ contact: { id, ...body } }, { status: 200 });
}

export async function DELETE(req, { params }) {
  return NextResponse.json({ success: true }, { status: 200 });
}
