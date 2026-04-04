import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    // Basic validation
    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    const backendApiUrl =
      process.env.BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:5000/api';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${backendApiUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    const isAbort = error?.name === 'AbortError';
    const message = isAbort
      ? 'Request timed out while contacting auth service.'
      : 'Auth service is unavailable. Please ensure backend is running on port 5000.';

    return NextResponse.json(
      {
        message,
        ...(process.env.NODE_ENV !== 'production' ? { detail: error?.message } : {}),
      },
      { status: 503 }
    );
  }
}
