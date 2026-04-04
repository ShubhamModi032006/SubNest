import { NextResponse } from "next/server";
import { subscriptionsDb } from "@/lib/subscriptionData";

export async function GET(request) {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");
  const subscriptions = customerId
    ? subscriptionsDb.list().filter((item) => String(item.customerId || item.customer_id || "") === String(customerId))
    : subscriptionsDb.list();
  return NextResponse.json({ subscriptions }, { status: 200 });
}

export async function POST(request) {
  try {
    const payload = await request.json();
    if (!payload.recurringPlanId) {
      return NextResponse.json({ message: "Recurring plan is required." }, { status: 400 });
    }
    if (!payload.startDate && !payload.start_date) {
      payload.startDate = new Date().toISOString().slice(0, 10);
    }

    const subscription = subscriptionsDb.create(payload);
    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
