import { NextResponse } from "next/server";
import { subscriptionsDb } from "@/lib/subscriptionData";

export async function POST(request, { params }) {
  const subscription = subscriptionsDb.renew(params.id);
  if (!subscription) {
    return NextResponse.json({ message: "Subscription not found" }, { status: 404 });
  }
  return NextResponse.json({ subscription }, { status: 200 });
}
