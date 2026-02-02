import { NextResponse } from 'next/server';
import { get_session } from './auth';

export const with_auth = async <T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | { error: string }>> => {
  const is_authenticated = await get_session();

  if (!is_authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return handler();
};
