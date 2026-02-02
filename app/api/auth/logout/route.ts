import { NextResponse } from 'next/server';
import { clear_session_cookie } from '@/lib/auth';

export const POST = async () => {
  await clear_session_cookie();
  return NextResponse.json({ success: true });
};
