import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Basic validation
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    if (email === 'demo@example.com' && password === 'Password@123') {
      return NextResponse.json({
        user: { id: '1', name: 'Demo User', email },
        token: 'fake-jwt-token-xyz789'
      }, { status: 200 });
    }

    return NextResponse.json({ message: 'Invalid email or password. Use demo@example.com / Password@123' }, { status: 401 });

  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
