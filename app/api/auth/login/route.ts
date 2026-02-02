import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verify_password, create_session, set_session_cookie } from '@/lib/auth';
import { check_rate_limit, reset_rate_limit } from '@/lib/rate-limit';

export const POST = async (request: Request) => {
  const header_list = await headers();
  const ip = header_list.get('x-forwarded-for') || header_list.get('x-real-ip') || 'unknown';

  const { allowed, remaining } = check_rate_limit(ip);

  if (!allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many attempts. Try again later.' },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { password } = body;

  if (!password || typeof password !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Password required' },
      { status: 400 }
    );
  }

  if (!verify_password(password)) {
    return NextResponse.json(
      { success: false, error: 'Invalid password' },
      { status: 401, headers: { 'X-RateLimit-Remaining': String(remaining) } }
    );
  }

  // Reset rate limit on successful login
  reset_rate_limit(ip);

  const token = await create_session();
  await set_session_cookie(token);

  return NextResponse.json({ success: true });
};
