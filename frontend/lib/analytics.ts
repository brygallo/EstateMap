type EventPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(eventName: string, payload: EventPayload = {}) {
  if (typeof window === 'undefined') return;

  const eventPayload = {
    event: eventName,
    ...payload,
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(eventPayload);

  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, payload);
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
        payload,
      }),
    }).catch(() => undefined);
  } catch {
    // La analítica nunca debe interrumpir la acción principal del usuario.
  }
}
