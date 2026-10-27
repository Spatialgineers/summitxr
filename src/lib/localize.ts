/* =========================================================================
   Bilingual data helpers (Spanish is the source of truth).
   Data objects (sessions, speakers, sponsors, tiers, map nodes, embeds,
   portfolio…) keep their Spanish fields and carry optional English twins
   named `<field>En` (titleEn, descriptionEn, tagsEn…). Components pick the
   right one with `loc(obj, 'field', language)`, which falls back to Spanish
   whenever the English twin is missing (e.g. admin-edited copies).
   ========================================================================= */

/** Returns `obj[key + 'En']` when the language is not Spanish and the twin exists; otherwise `obj[key]`. */
export function loc<T extends object, K extends keyof T & string>(obj: T, key: K, language: string): T[K] {
  if (language !== 'es') {
    const en = (obj as Record<string, unknown>)[`${key}En`];
    if (en !== undefined && en !== null && en !== '' && !(Array.isArray(en) && en.length === 0)) return en as T[K];
  }
  return obj[key];
}

/**
 * Copies the `<field>En` twins from the built-in data onto a persisted copy (localStorage),
 * but only for fields whose Spanish text is still the original one, so an edited
 * Spanish text never shows a stale English translation.
 */
export function withEnTwins<T extends { id: string }>(stored: T[], initial: T[]): T[] {
  const byId = new Map(initial.map((item) => [item.id, item]));
  return stored.map((item) => {
    const base = byId.get(item?.id) as Record<string, unknown> | undefined;
    if (!item || !base) return item;
    const out: Record<string, unknown> = { ...item };
    for (const key of Object.keys(base)) {
      const nested = base[key];
      if (Array.isArray(nested) && Array.isArray(out[key]) && nested.every((n) => n && typeof n === 'object' && 'id' in n)) {
        out[key] = withEnTwins(out[key] as { id: string }[], nested as { id: string }[]);
        continue;
      }
      if (!key.endsWith('En') || out[key] !== undefined) continue;
      const field = key.slice(0, -2);
      if (JSON.stringify(out[field]) === JSON.stringify(base[field])) out[key] = base[key];
    }
    return out as T;
  });
}
