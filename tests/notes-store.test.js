import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSelectUrl, authHeaders, buildUpsertRow, getNotes, upsertNote } from "../js/notes-store.js";

const CFG = { url: "https://proj.supabase.co", anonKey: "anon123", table: "merchant_notes" };

test("buildSelectUrl: список uid в in.()", () => {
  const u = buildSelectUrl(CFG, [1, 2, 3]);
  assert.ok(u.startsWith("https://proj.supabase.co/rest/v1/merchant_notes?"));
  assert.match(u, /uid=in\.\(1,2,3\)/);
  assert.match(u, /select=\*/);
});

test("authHeaders: apikey и Bearer", () => {
  const h = authHeaders(CFG);
  assert.equal(h.apikey, "anon123");
  assert.equal(h.Authorization, "Bearer anon123");
});

test("buildUpsertRow: нормализует поля и ставит updated_at", () => {
  const row = buildUpsertRow(42, { userName: "A", note: "hi", tags: ["x", "y"], contacts: [{ type: "tg", value: "@a" }] }, () => "2026-08-15T00:00:00.000Z");
  assert.equal(row.uid, 42);
  assert.equal(row.user_name, "A");
  assert.equal(row.note, "hi");
  assert.deepEqual(row.tags, ["x", "y"]);
  assert.deepEqual(row.contacts, [{ type: "tg", value: "@a" }]);
  assert.equal(row.updated_at, "2026-08-15T00:00:00.000Z");
});

test("getNotes: маппит ответ в Map по uid", async () => {
  const rows = [{ uid: 1, note: "a", tags: [], contacts: [] }, { uid: 2, note: "b", tags: ["v"], contacts: [] }];
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => rows });
  const map = await getNotes(CFG, [1, 2], { fetchImpl });
  assert.equal(map.get(2).note, "b");
  assert.deepEqual(map.get(2).tags, ["v"]);
});

test("getNotes: пустой список uid → пустой Map без запроса", async () => {
  let called = false;
  const fetchImpl = async () => { called = true; return { ok: true, json: async () => [] }; };
  const map = await getNotes(CFG, [], { fetchImpl });
  assert.equal(map.size, 0);
  assert.equal(called, false);
});

test("upsertNote: POST с Prefer merge-duplicates, возвращает строку", async () => {
  let captured;
  const fetchImpl = async (url, init) => { captured = { url, init }; return { ok: true, status: 201, json: async () => [{ uid: 7, note: "n" }] }; };
  const r = await upsertNote(CFG, 7, { note: "n" }, { fetchImpl, now: () => "2026-08-15T00:00:00.000Z" });
  assert.equal(captured.init.method, "POST");
  assert.match(captured.init.headers.Prefer, /merge-duplicates/);
  assert.equal(r.uid, 7);
});
