// Fire-and-forget beacons to the droplet's own analytics server (Caddy proxies
// /collect to localhost:4000). Never throws: analytics must never break a tool.
//
// Automatic events (after initAnalytics()):
//   pageview    — with screen/viewport, language, timezone, utm_*, previous path
//   page_leave  — engaged (tab-visible) time + max scroll depth for the page
//   outbound    — clicks on links to other sites
//   download    — clicks on links to files / <a download>
//   js_error    — uncaught errors (capped per page load)
//   <custom>    — any element with data-track="name" (+ optional data-track-label)

const SITE = 'station255';
const SESSION_KEY = 's255_sid';
const CONSENT_KEY = 's255_consent';

function canTrack(): boolean {
  return localStorage.getItem(CONSENT_KEY) === 'yes';
}

function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

function randomId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function track(event: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  try {
    if (!canTrack()) return;
    // Owner opt-out: run localStorage.analytics_optout = '1' in the console.
    if (localStorage.getItem('analytics_optout') === '1') return;
    const payload: Record<string, unknown> = {
      site: SITE,
      page: window.location.pathname,
      event,
      ref: document.referrer || '',
      session_id: getSessionId(),
    };
    if (data) payload.data = data;
    if (event === 'tool_use') return queueToolUse(payload);
    send(payload);
  } catch {
    // silently ignore — analytics should never break the page
  }
}

function send(payload: Record<string, unknown>): void {
  navigator.sendBeacon('/collect', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
}

// Many tools re-render (and call track('tool_use')) on every slider tick or
// keystroke. Hold each tool's latest call and send it once input settles, so a
// drag is one event carrying the final settings. Capped per pageview.
const TOOL_USE_SETTLE_MS = 2000;
const MAX_TOOL_USES_PER_VIEW = 20;
const pendingToolUse = new Map<string, { payload: Record<string, unknown>; timer: ReturnType<typeof setTimeout> }>();
let toolUsesThisView = 0;

function queueToolUse(payload: Record<string, unknown>): void {
  const key = String((payload.data as Record<string, unknown> | undefined)?.tool ?? payload.page);
  const prev = pendingToolUse.get(key);
  if (prev) clearTimeout(prev.timer);
  const timer = setTimeout(() => flushToolUse(key), TOOL_USE_SETTLE_MS);
  pendingToolUse.set(key, { payload, timer });
}

function flushToolUse(key?: string): void {
  for (const k of key ? [key] : [...pendingToolUse.keys()]) {
    const p = pendingToolUse.get(k);
    if (!p) continue;
    clearTimeout(p.timer);
    pendingToolUse.delete(k);
    if (++toolUsesThisView <= MAX_TOOL_USES_PER_VIEW) send(p.payload);
  }
}

// ── Page lifecycle ──────────────────────────────────────────────────────────

let pvId = '';
let visibleSince = 0;
let maxScroll = 0;
let lastPath: string | null = null;

function scrollPct(): number {
  const el = document.documentElement;
  if (el.scrollHeight - window.innerHeight <= 0) return 100;
  return Math.min(100, Math.round(((window.scrollY + window.innerHeight) / el.scrollHeight) * 100));
}

function context(): Record<string, unknown> {
  const ctx: Record<string, unknown> = {
    sw: screen.width,
    sh: screen.height,
    vw: window.innerWidth,
    lang: navigator.language,
  };
  try { ctx.tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* old browser */ }
  const q = new URLSearchParams(location.search);
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const v = q.get(k);
    if (v) ctx[k] = v.slice(0, 80);
  }
  const ref = q.get('ref');
  if (!ctx.utm_source && ref) ctx.utm_source = ref.slice(0, 80);
  return ctx;
}

/** Call from afterNavigate — fires on first load and every client navigation. */
export function trackPageview(): void {
  if (typeof window === 'undefined') return;
  flushToolUse();
  toolUsesThisView = 0;
  pvId = randomId().slice(0, 12);
  visibleSince = document.visibilityState === 'visible' ? Date.now() : 0;
  maxScroll = scrollPct();
  track('pageview', { ...context(), from: lastPath ?? '', pv: pvId });
  lastPath = location.pathname;
}

/** Sends the engaged-time segment for the current page. Call from beforeNavigate. */
export function trackLeave(): void {
  flushToolUse(); // don't lose a pending tool_use when the tab closes or navigates
  if (!pvId || !visibleSince) return;
  const ms = Date.now() - visibleSince;
  visibleSince = 0;
  if (ms < 500) return;
  track('page_leave', { duration_ms: ms, scroll_pct: Math.max(maxScroll, scrollPct()), pv: pvId });
}

let started = false;
let errorCount = 0;
const FILE_RE = /\.(pdf|zip|dmg|exe|msi|pkg|tar|gz|tgz|7z|rar|apk|ipa|mp3|wav|mp4|mov|csv|json|txt|ico|png|jpe?g|gif|webp|svg)$/i;

/** Registers the automatic listeners once. Call from the root layout's onMount. */
export function initAnalytics(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  let raf = 0;
  window.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; maxScroll = Math.max(maxScroll, scrollPct()); });
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') trackLeave();
    else if (pvId && !visibleSince) visibleSince = Date.now();
  });
  window.addEventListener('pagehide', trackLeave);

  document.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    const tagged = target?.closest?.('[data-track]') as HTMLElement | null;
    if (tagged?.dataset.track) {
      track(tagged.dataset.track, tagged.dataset.trackLabel ? { label: tagged.dataset.trackLabel } : undefined);
    }
    const a = target?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a) return;
    let url: URL;
    try { url = new URL(a.href, location.href); } catch { return; }
    if (url.protocol === 'mailto:' || url.protocol === 'tel:') {
      track('outbound', { url: url.protocol.slice(0, -1) });
    } else if (!/^https?:$/.test(url.protocol)) {
      return; // blob:/data: — in-app exports are tracked explicitly
    } else if (url.host !== location.host) {
      track('outbound', { url: (url.host + url.pathname).slice(0, 200) });
    } else if (a.hasAttribute('download') || FILE_RE.test(url.pathname)) {
      track('download', { file: decodeURIComponent(url.pathname.split('/').pop() || url.pathname).slice(0, 120) });
    }
  }, { capture: true });

  const reportError = (msg: string, src: string) => {
    if (++errorCount > 5) return;
    track('js_error', { msg: msg.slice(0, 200), src: src.slice(0, 200) });
  };
  window.addEventListener('error', (e) => {
    if (!e.message) return; // resource load errors carry no message
    const file = (e.filename || '').replace(location.origin, '');
    reportError(e.message, `${file}:${e.lineno}:${e.colno}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    reportError(String(r?.message ?? r ?? 'unhandled rejection'), 'promise');
  });
}
