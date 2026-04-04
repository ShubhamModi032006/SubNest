import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // Decode the mock token which is just base64 of the user object
      const userStr = Buffer.from(token, 'base64').toString('utf-8');
      const user = JSON.parse(userStr);
      
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      return NextResponse.json({
        user
      }, { status: 200 });
      
    } catch (e) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
