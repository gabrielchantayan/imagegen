const attempts = new Map<string, { count: number; reset_at: number }>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export const check_rate_limit = (ip: string): { allowed: boolean; remaining: number } => {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now > record.reset_at) {
    attempts.set(ip, { count: 1, reset_at: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: MAX_ATTEMPTS - record.count };
};

export const reset_rate_limit = (ip: string): void => {
  attempts.delete(ip);
};
