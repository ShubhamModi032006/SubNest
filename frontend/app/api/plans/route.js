import { NextResponse } from "next/server";
import { plansDb, validatePlanInput } from "@/lib/configurationData";

export async function GET() {
  return NextResponse.json({ plans: plansDb.list() }, { status: 200 });
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const error = validatePlanInput(payload);
    if (error) {
      return NextResponse.json({ message: error }, { status: 400 });
    }

    const plan = plansDb.create(payload);
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
