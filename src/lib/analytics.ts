const SITE = 'station255';
const SESSION_KEY = 's255_sid';

function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

export function track(event: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  try {
    const payload: Record<string, unknown> = {
      site: SITE,
      page: window.location.pathname,
      event,
      ref: document.referrer || '',
      session_id: getSessionId(),
    };
    if (data) payload.data = data;
    navigator.sendBeacon('/collect', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
  } catch {
    // silently ignore — analytics should never break the tool
  }
}
