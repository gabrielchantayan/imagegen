import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'pb_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Get or generate JWT secret
const get_jwt_secret = (): Uint8Array => {
  const secret = process.env.JWT_SECRET || process.env.APP_PASSWORD;
  return new TextEncoder().encode(secret);
};

// Verify password against env
export const verify_password = (password: string): boolean => {
  return password === process.env.APP_PASSWORD;
};

// Create session token
export const create_session = async (): Promise<string> => {
  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(get_jwt_secret());

  return token;
};

// Verify session token
export const verify_session = async (token: string): Promise<boolean> => {
  try {
    await jwtVerify(token, get_jwt_secret());
    return true;
  } catch {
    return false;
  }
};

// Get session from cookies
export const get_session = async (): Promise<boolean> => {
  const cookie_store = await cookies();
  const token = cookie_store.get(COOKIE_NAME)?.value;

  if (!token) return false;
  return verify_session(token);
};

// Set session cookie
export const set_session_cookie = async (token: string): Promise<void> => {
  const cookie_store = await cookies();
  cookie_store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
};

// Clear session cookie
export const clear_session_cookie = async (): Promise<void> => {
  const cookie_store = await cookies();
  cookie_store.delete(COOKIE_NAME);
};
