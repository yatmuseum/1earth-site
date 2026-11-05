// Live mint status from the server (/api/status), shared across the page.
import { useEffect, useState } from "react";

let current = null;
const listeners = new Set();
let timer = null;

async function refresh() {
  try {
    const r = await fetch("/api/status");
    if (r.ok) {
      current = await r.json();
      listeners.forEach((fn) => fn(current));
    }
  } catch { /* offline or local preview */ }
}

export function refreshStatus() { return refresh(); }

export function setStatusLocally(update) {
  if (!current) return;
  current = update(current);
  listeners.forEach((fn) => fn(current));
}

export function useStatus() {
  const [s, setS] = useState(current);
  useEffect(() => {
    listeners.add(setS);
    if (!timer) { refresh(); timer = setInterval(refresh, 20000); }
    return () => listeners.delete(setS);
  }, []);
  return s;
}
