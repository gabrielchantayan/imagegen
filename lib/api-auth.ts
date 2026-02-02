import { NextResponse } from 'next/server';
import { get_session } from './auth';

export const with_auth = async (
  handler: () => Promise<NextResponse>
): Promise<NextResponse> => {
  const is_authenticated = await get_session();

  if (!is_authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return handler();
};
