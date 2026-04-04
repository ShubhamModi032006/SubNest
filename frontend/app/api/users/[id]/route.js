import { NextResponse } from "next/server";

// Using require to share state if possible, though local let falls back.
let users = require('../route').users || [];

export async function GET(req, { params }) {
  // Mock fetching a single user. In prod, use DB.
  // We can't strictly share 'let users' from another file easily in Next.js without a global variable.
  // We'll trust the frontend state management (Zustand) for read operations in this mock.
  const id = params.id;
  return NextResponse.json({ user: { id, name: "Mock User " + id, email: "mock@example.com", role: "user", phone: "111", address: "Mock City", created_at: new Date().toISOString() } }, { status: 200 });
}

export async function PUT(req, { params }) {
  const id = params.id;
  const body = await req.json();
  return NextResponse.json({ user: { id, ...body } }, { status: 200 });
}

export async function DELETE(req, { params }) {
  return NextResponse.json({ success: true }, { status: 200 });
}
