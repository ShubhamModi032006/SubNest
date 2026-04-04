import { NextResponse } from "next/server";
import { subscriptionsDb } from "@/lib/subscriptionData";
import { invoicesDb } from "@/lib/invoiceData";

export async function POST(request, { params }) {
  const subscription = subscriptionsDb.getById(params.id);
  if (!subscription) {
    return NextResponse.json({ message: "Subscription not found" }, { status: 404 });
  }

  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + 15);

  const invoice = invoicesDb.create({
    customerLabel: subscription.customerLabel,
    customerId: subscription.customerId,
    invoiceDate: today.toISOString().slice(0, 10),
    dueDate: due.toISOString().slice(0, 10),
    linkedSubscriptionId: subscription.id,
    status: "draft",
    lines: (subscription.orderLines || []).map((line) => ({
      productId: line.productId,
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountAmount: line.discountAmount,
      taxAmount: line.taxAmount,
      total: line.amount,
    })),
  });

  return NextResponse.json({ invoice }, { status: 201 });
}
