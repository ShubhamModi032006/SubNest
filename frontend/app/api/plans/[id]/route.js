import { NextResponse } from "next/server";
import { plansDb, validatePlanInput } from "@/lib/configurationData";

export async function GET(request, { params }) {
  const plan = plansDb.getById(params.id);
  if (!plan) {
    return NextResponse.json({ message: "Plan not found" }, { status: 404 });
  }
  return NextResponse.json({ plan }, { status: 200 });
}

export async function PUT(request, { params }) {
  try {
    const payload = await request.json();
    const error = validatePlanInput(payload);
    if (error) {
      return NextResponse.json({ message: error }, { status: 400 });
    }

    const plan = plansDb.update(params.id, payload);
    if (!plan) {
      return NextResponse.json({ message: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ plan }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const removed = plansDb.remove(params.id);
  if (!removed) {
    return NextResponse.json({ message: "Plan not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true }, { status: 200 });
}
