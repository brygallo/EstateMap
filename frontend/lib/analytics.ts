type EventPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(eventName: string, payload: EventPayload = {}) {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const attributionKey = 'geo:first-attribution';
  let attribution: Record<string, string> = {};
  try {
    attribution = JSON.parse(window.localStorage.getItem(attributionKey) || '{}');
  } catch {
    attribution = {};
  }
  if (!attribution.landing_page) {
    const referrer = document.referrer || '';
    let referrerHost = '';
    try { referrerHost = referrer ? new URL(referrer).hostname : ''; } catch { /* Invalid URL */ }
    const medium = params.get('utm_medium') || '';
    const source = params.get('utm_source') || referrerHost || 'direct';
    const channel = medium === 'organic' || (!medium && referrerHost && /google|bing|yahoo|duckduckgo/.test(referrerHost))
      ? 'organic'
      : medium || (referrerHost ? 'referral' : 'direct');
    attribution = {
      source,
      medium,
      campaign: params.get('utm_campaign') || '',
      term: params.get('utm_term') || '',
      content: params.get('utm_content') || '',
      channel,
      referrer,
      landing_page: `${window.location.pathname}${window.location.search}`.slice(0, 300),
    };
    try { window.localStorage.setItem(attributionKey, JSON.stringify(attribution)); } catch { /* Storage is unavailable */ }
  }

  const enrichedPayload = { attribution, ...payload };
  const eventPayload = {
    event: eventName,
    ...enrichedPayload,
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(eventPayload);

  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, enrichedPayload);
  }

  // Auditoría funcional propia: permite detectar embudos incompletos y contar
  // contactos por propiedad sin depender exclusivamente de Google Analytics.
  try {
    const sessionKey = 'geo:activity-session';
    let sessionId = window.localStorage.getItem(sessionKey);
    if (!sessionId) {
      sessionId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(sessionKey, sessionId);
    }
    const token = window.localStorage.getItem('token') || window.sessionStorage.getItem('token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010/api';
    void fetch(`${apiUrl}/activity-events/`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        event_name: eventName,
        session_id: sessionId,
        path: `${window.location.pathname}${window.location.search}`.slice(0, 300),
        payload: enrichedPayload,
      }),
    }).catch(() => undefined);
  } catch {
    // La analítica nunca debe interrumpir la acción principal del usuario.
  }
}
