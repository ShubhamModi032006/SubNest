import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Basic validation
    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    // Always succeed to not leak user info
    return NextResponse.json({ message: 'If an account exists, a reset link was sent.' }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
