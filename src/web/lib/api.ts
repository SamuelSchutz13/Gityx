import { useCallback, useEffect, useRef, useState } from 'react';

export class ApiError extends Error {
  constructor(readonly status: number, readonly body: unknown) {
    super(typeof body === 'object' && body && 'message' in body ? String((body as any).message) : `Erro ${status}`);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin', ...init });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // plain text error
  }
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export const api = {
  get: <T>(path: string) => call<T>(path),
  post: <T>(path: string, body: unknown) =>
    call<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
};

export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [state, setState] = useState<{ data?: T; error?: ApiError; loading: boolean }>({ loading: !!path });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    api
      .get<T>(path)
      .then((data) => alive && setState({ data, loading: false }))
      .catch((error) => alive && setState((s) => ({ data: s.data, error, loading: false })));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);
  return { ...state, reload };
}

export type LiveType = 'changes' | 'history';
type Listener = (type: LiveType) => void;

// One EventSource for the whole page: browsers cap HTTP/1.1 connections per host at 6.
const listeners = new Set<Listener>();
let source: EventSource | null = null;

function connect() {
  if (source || typeof EventSource === 'undefined') return;
  source = new EventSource('/api/events');
  for (const t of ['changes', 'history'] as const) source.addEventListener(t, () => listeners.forEach((l) => l(t)));
}

export function useLive(onEvent: Listener) {
  const ref = useRef(onEvent);
  ref.current = onEvent;
  useEffect(() => {
    const l: Listener = (t) => ref.current(t);
    listeners.add(l);
    connect();
    return () => {
      listeners.delete(l);
    };
  }, []);
}
