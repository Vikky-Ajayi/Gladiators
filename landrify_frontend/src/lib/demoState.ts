/**
 * Frontend-only demo state for the hackathon presentation.
 *
 * Payment + NIN verification are simulated entirely in the browser using
 * localStorage so the demo is bullet-proof: it works even if the backend
 * (Railway) is down or running an older build.
 *
 * When a real payment / identity backend is wired up, callers can simply
 * stop reading these flags — they are only an OVERLAY on top of whatever
 * the backend reports.
 */

const PRO_KEY = 'landrify_demo_pro';
const PRO_AT_KEY = 'landrify_demo_pro_at';
const NIN_KEY = 'landrify_demo_nin_verified';
const NIN_LAST4_KEY = 'landrify_demo_nin_last4';
const NIN_AT_KEY = 'landrify_demo_nin_verified_at';

export interface DemoOverlay {
  is_pro: boolean;
  plan?: 'pro' | 'basic';
  pro_expires_at?: string;
  nin_verified: boolean;
  nin_last_four?: string;
  nin_verified_at?: string;
}

export function getDemoOverlay(): DemoOverlay {
  const isPro = localStorage.getItem(PRO_KEY) === '1';
  const ninVerified = localStorage.getItem(NIN_KEY) === '1';
  const overlay: DemoOverlay = {
    is_pro: isPro,
    nin_verified: ninVerified,
  };
  if (isPro) {
    overlay.plan = 'pro';
    const at = localStorage.getItem(PRO_AT_KEY);
    if (at) {
      const d = new Date(at);
      d.setDate(d.getDate() + 30);
      overlay.pro_expires_at = d.toISOString();
    }
  }
  if (ninVerified) {
    overlay.nin_last_four = localStorage.getItem(NIN_LAST4_KEY) || undefined;
    overlay.nin_verified_at = localStorage.getItem(NIN_AT_KEY) || undefined;
  }
  return overlay;
}

export function setDemoPro() {
  localStorage.setItem(PRO_KEY, '1');
  localStorage.setItem(PRO_AT_KEY, new Date().toISOString());
}

export function setDemoNinVerified(nin: string) {
  localStorage.setItem(NIN_KEY, '1');
  localStorage.setItem(NIN_LAST4_KEY, nin.slice(-4));
  localStorage.setItem(NIN_AT_KEY, new Date().toISOString());
}

export function clearDemoState() {
  [PRO_KEY, PRO_AT_KEY, NIN_KEY, NIN_LAST4_KEY, NIN_AT_KEY].forEach((k) =>
    localStorage.removeItem(k)
  );
}

/** Merge the backend user object with the local demo overlay. */
export function applyDemoOverlay<T extends Record<string, any>>(user: T | null): T | null {
  if (!user) return user;
  const o = getDemoOverlay();
  return {
    ...user,
    is_pro: user.is_pro || o.is_pro,
    plan: o.is_pro ? 'pro' : (user.plan ?? 'basic'),
    pro_expires_at: o.pro_expires_at ?? user.pro_expires_at,
    nin_verified: user.nin_verified || o.nin_verified,
    nin_last_four: user.nin_last_four ?? o.nin_last_four,
    nin_verified_at: user.nin_verified_at ?? o.nin_verified_at,
    can_scan: user.can_scan || o.is_pro,
  };
}
