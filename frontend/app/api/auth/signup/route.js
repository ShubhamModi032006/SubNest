import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, role } = body;
    const allowedRoles = ['user', 'internal'];

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }
    
    const normalizedRole = String(role || 'user').toLowerCase();
    const assignedRole = allowedRoles.includes(normalizedRole) ? normalizedRole : 'user';
    const newUser = { id: Date.now().toString(), name, email, role: assignedRole };
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
