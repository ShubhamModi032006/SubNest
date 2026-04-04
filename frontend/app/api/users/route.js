import { NextResponse } from "next/server";

let users = [
  { id: "1", name: "Admin Setup", email: "admin@example.com", role: "admin", phone: "123-456-7890", address: "123 Admin Way", created_at: new Date().toISOString() },
  { id: "2", name: "Internal User", email: "internal@example.com", role: "internal", phone: "987-654-3210", address: "456 Office St", created_at: new Date().toISOString() },
  { id: "3", name: "Regular Portal", email: "user@example.com", role: "user", phone: "555-555-5555", address: "789 User Blvd", created_at: new Date().toISOString() }
];

export async function GET(req) {
  return NextResponse.json({ users }, { status: 200 });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const newUser = {
      id: Date.now().toString(),
      ...body,
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
