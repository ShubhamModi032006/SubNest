import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }
    
    const newUser = { id: Date.now().toString(), name, email, role: role || 'user' };
    const fakeJwt = Buffer.from(JSON.stringify(newUser)).toString('base64');
    
    // Simulate successful signup
    return NextResponse.json({
      user: newUser,
      token: fakeJwt
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
