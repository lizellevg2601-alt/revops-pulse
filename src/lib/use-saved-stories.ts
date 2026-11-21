"use client";

import { useSyncExternalStore } from "react";
import { parseSavedIds } from "./feed";

const key = "revops-pulse-saved-v1";
const eventName = "revops-pulse-saved-change";
let memorySnapshot = "[]";
let storageAvailable = true;

function getSnapshot() {
  if (!storageAvailable) return memorySnapshot;
  try {
    return localStorage.getItem(key) || "[]";
  } catch {
    return memorySnapshot;
  }
}

function subscribe(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) notify();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(eventName, notify);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(eventName, notify);
  };
}

export function useSavedStories() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  const savedIds = parseSavedIds(snapshot);

  function toggleSave(id: string) {
    const current = parseSavedIds(getSnapshot());
    const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id];
    memorySnapshot = JSON.stringify(next);
    try {
      localStorage.setItem(key, memorySnapshot);
    } catch {
      storageAvailable = false;
      // Saving still works for this tab when browser storage is unavailable.
    }
    window.dispatchEvent(new Event(eventName));
  }

  return { savedIds, toggleSave };
}
