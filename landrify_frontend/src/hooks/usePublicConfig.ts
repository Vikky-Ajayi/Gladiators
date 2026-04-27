import { useEffect, useState } from 'react';
import client from '../api/client';

export interface PublicConfig {
  test_mode: boolean;
}

let cache: PublicConfig | null = null;
let inflight: Promise<PublicConfig> | null = null;

const fetchConfig = async () => {
  if (cache) return cache;
  if (!inflight) {
    inflight = client
      .get<PublicConfig>('/api/v1/config/', {
        headers: { 'X-Skip-Auth': 'true' },
      })
      .then((r) => {
        cache = r.data;
        return r.data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};

/**
 * Fetches the small set of safe-for-client settings that still come from the
 * backend at runtime.
 */
export function usePublicConfig(): PublicConfig | null {
  const [cfg, setCfg] = useState<PublicConfig | null>(cache);
  useEffect(() => {
    if (cfg) return;
    fetchConfig().then(setCfg).catch(() => setCfg({ test_mode: false }));
  }, [cfg]);
  return cfg;
}
