"use client";

import { SWRConfig } from "swr";

const SWR_CONFIG = {
  // Limit cache size to prevent unbounded memory growth
  provider: () => {
    const cache = new Map();
    const MAX_CACHE_SIZE = 100;

    return {
      get: (key: string) => cache.get(key),
      set: (key: string, value: unknown) => {
        // Evict oldest entries if cache is full
        if (cache.size >= MAX_CACHE_SIZE && !cache.has(key)) {
          const first_key = cache.keys().next().value;
          if (first_key) {
            cache.delete(first_key);
          }
        }
        cache.set(key, value);
      },
      delete: (key: string) => cache.delete(key),
      keys: () => cache.keys(),
    };
  },
  // Dedupe requests within 2 seconds
  dedupingInterval: 2000,
  // Don't revalidate on focus to reduce unnecessary requests
  revalidateOnFocus: false,
};

type ProvidersProps = {
  children: React.ReactNode;
};

export const Providers = ({ children }: ProvidersProps) => {
  return <SWRConfig value={SWR_CONFIG}>{children}</SWRConfig>;
};
