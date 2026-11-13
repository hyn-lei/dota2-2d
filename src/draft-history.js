import { normalizeDraftHistory } from './bot-draft.js';

export const DRAFT_HISTORY_KEY = 'af-ai-drafts-v1';

export function loadDraftHistory(storage, fallback = []) {
  try {
    const value = storage?.getItem(DRAFT_HISTORY_KEY);
    if (value) return normalizeDraftHistory(JSON.parse(value));
  } catch {}
  return normalizeDraftHistory(fallback);
}

export function storeDraftHistory(storage, history) {
  try {
    if (!storage) return false;
    storage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(normalizeDraftHistory(history)));
    return true;
  } catch { return false; }
}
