import { useSyncExternalStore } from "react";

import { parseJwt } from "@/lib/jwt";
import type { StoredSession } from "@/types/auth";

const STORAGE_KEY = "vsp.admin.session";
const CHANGE_EVENT = "vsp-admin-session-change";

const listeners = new Set<() => void>();
let cachedRawSession: string | null | undefined;
let cachedSession: StoredSession | null = null;

const readStoredSession = (): StoredSession | null => {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (raw === cachedRawSession) {
    return cachedSession;
  }

  cachedRawSession = raw;

  if (!raw) {
    cachedSession = null;
    return cachedSession;
  }

  try {
    const parsed = JSON.parse(raw) as Omit<StoredSession, "decoded"> & { decoded?: StoredSession["decoded"] };
    const decoded = parsed.decoded ?? parseJwt(parsed.accessToken);

    cachedSession = {
      ...parsed,
      decoded
    };

    return cachedSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    cachedRawSession = null;
    cachedSession = null;
    return cachedSession;
  }
};

const emitChange = () => {
  listeners.forEach((listener) => listener());
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

const subscribeSession = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  window.addEventListener(CHANGE_EVENT, listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
};

const getStoredSession = (): StoredSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return readStoredSession();
};

const setStoredSession = (input: { accessToken: string; refreshToken?: string; expiresAt: string }) => {
  const session: StoredSession = {
    ...input,
    decoded: parseJwt(input.accessToken)
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  emitChange();

  return session;
};

const updateStoredSession = (patch: Partial<Omit<StoredSession, "decoded">> & { accessToken?: string }) => {
  const current = getStoredSession();
  if (!current) {
    return null;
  }

  return setStoredSession({
    accessToken: patch.accessToken ?? current.accessToken,
    refreshToken: patch.refreshToken ?? current.refreshToken,
    expiresAt: patch.expiresAt ?? current.expiresAt
  });
};

const clearStoredSession = () => {
  window.localStorage.removeItem(STORAGE_KEY);
  cachedRawSession = null;
  cachedSession = null;
  emitChange();
};

const useStoredSession = () =>
  useSyncExternalStore(subscribeSession, getStoredSession, () => null);

export { clearStoredSession, getStoredSession, setStoredSession, subscribeSession, updateStoredSession, useStoredSession };
