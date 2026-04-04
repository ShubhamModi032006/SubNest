import { NextResponse } from "next/server";

let contacts = [
  { id: "101", name: "John Doe Contact", email: "john@contact.com", phone: "123-123-1234", address: "Contact Ave", user_id: "3", created_at: new Date().toISOString() },
  { id: "102", name: "Jane Smith", email: "jane@contact.com", phone: "321-321-4321", address: "Jane Drive", user_id: "2", created_at: new Date().toISOString() }
];

export async function GET(req) {
  return NextResponse.json({ contacts }, { status: 200 });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const newContact = {
      id: Date.now().toString(),
      ...body,
      created_at: new Date().toISOString()
    };
    contacts.push(newContact);
    return NextResponse.json({ contact: newContact }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
