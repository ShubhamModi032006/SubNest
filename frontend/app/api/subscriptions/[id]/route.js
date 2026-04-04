import { NextResponse } from "next/server";
import { subscriptionsDb } from "@/lib/subscriptionData";

export async function GET(request, { params }) {
  const subscription = subscriptionsDb.getById(params.id);
  if (!subscription) {
    return NextResponse.json({ message: "Subscription not found" }, { status: 404 });
  }
  return NextResponse.json({ subscription }, { status: 200 });
}

export async function PUT(request, { params }) {
  try {
    const payload = await request.json();
    const subscription = subscriptionsDb.update(params.id, payload);
    if (!subscription) {
      return NextResponse.json({ message: "Subscription not found" }, { status: 404 });
    }
    return NextResponse.json({ subscription }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
