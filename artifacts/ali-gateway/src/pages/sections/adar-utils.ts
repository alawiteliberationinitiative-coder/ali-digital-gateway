const LS_KEY = "adar_read_posts";
const FOUNDING_POST_ID = "bayan-inbiaath-2026";

export function getReadSet(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) ?? "[]")); }
  catch { return new Set(); }
}

export function markRead(id: string) {
  const s = getReadSet(); s.add(id);
  localStorage.setItem(LS_KEY, JSON.stringify([...s]));
}

export function getAdarUnreadCount(): number {
  const read = getReadSet();
  return [FOUNDING_POST_ID].filter((id) => !read.has(id)).length;
}
