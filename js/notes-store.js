// Supabase REST для заметок мерчантов. Построители URL/payload — чистые (тестируемы),
// CRUD принимают fetchImpl для тестов.

export function authHeaders(cfg) {
  return { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}`, "Content-Type": "application/json" };
}

const base = (cfg) => `${cfg.url}/rest/v1/${cfg.table}`;

export function buildSelectUrl(cfg, uids) {
  const list = (uids || []).map((u) => String(u)).join(",");
  return `${base(cfg)}?uid=in.(${list})&select=*`;
}

export function buildUpsertRow(uid, patch = {}, now = () => new Date().toISOString()) {
  return {
    uid,
    user_name: patch.userName != null ? String(patch.userName) : undefined,
    nickname: patch.nickname != null ? String(patch.nickname) : "",
    note: patch.note != null ? String(patch.note) : "",
    tags: Array.isArray(patch.tags) ? patch.tags.map(String) : [],
    contacts: Array.isArray(patch.contacts) ? patch.contacts.map((c) => ({ type: String(c.type || ""), value: String(c.value || "") })) : [],
    blacklist: !!patch.blacklist,
    updated_at: now(),
  };
}

function normNote(row) {
  return { uid: row.uid, userName: row.user_name || "", nickname: row.nickname || "", note: row.note || "", tags: row.tags || [], contacts: row.contacts || [], blacklist: !!row.blacklist };
}

export async function getNotes(cfg, uids, { fetchImpl = globalThis.fetch } = {}) {
  const map = new Map();
  if (!uids || !uids.length) return map;
  const res = await fetchImpl(buildSelectUrl(cfg, uids), { headers: authHeaders(cfg) });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  for (const row of await res.json()) map.set(row.uid, normNote(row));
  return map;
}

export async function upsertNote(cfg, uid, patch, { fetchImpl = globalThis.fetch, now = () => new Date().toISOString() } = {}) {
  const row = buildUpsertRow(uid, patch, now);
  const res = await fetchImpl(base(cfg), {
    method: "POST",
    headers: { ...authHeaders(cfg), Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  const out = await res.json();
  return normNote(Array.isArray(out) ? out[0] : out);
}

export async function deleteNote(cfg, uid, { fetchImpl = globalThis.fetch } = {}) {
  const res = await fetchImpl(`${base(cfg)}?uid=eq.${encodeURIComponent(uid)}`, { method: "DELETE", headers: authHeaders(cfg) });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
}
