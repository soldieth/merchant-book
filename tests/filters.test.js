import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFilters, sortMerchants, searchMerchants } from "../js/filters.js";

const M = (o) => ({
  uid: 1, userName: "Alice", merchantLevel: 2, isOnline: true,
  tradeCount: 100, orderCompleteRate: 97, minPrice: 6.5, maxPrice: 6.7,
  minLimit: 1000, maxLimit: 50000, payMethods: ["WeChat"], adCount: 1, ...o,
});

test("applyFilters: onlineOnly отсекает офлайн", () => {
  const r = applyFilters([M({ uid: 1 }), M({ uid: 2, isOnline: false })], { onlineOnly: true }, new Map());
  assert.deepEqual(r.map((m) => m.uid), [1]);
});

test("applyFilters: minLevel", () => {
  const r = applyFilters([M({ uid: 1, merchantLevel: 1 }), M({ uid: 2, merchantLevel: 3 })], { minLevel: 2 }, new Map());
  assert.deepEqual(r.map((m) => m.uid), [2]);
});

test("applyFilters: диапазон суммы пересекается с лимитами ad'а", () => {
  // хотим торговать на 20000: у мерчанта лимиты 1000..50000 → подходит
  const r = applyFilters([M({ uid: 1, minLimit: 1000, maxLimit: 50000 }), M({ uid: 2, minLimit: 60000, maxLimit: 90000 })], { minAmount: 20000, maxAmount: 20000 }, new Map());
  assert.deepEqual(r.map((m) => m.uid), [1]);
});

test("applyFilters: payMethod", () => {
  const r = applyFilters([M({ uid: 1, payMethods: ["WeChat"] }), M({ uid: 2, payMethods: ["Alipay"] })], { payMethod: "Alipay" }, new Map());
  assert.deepEqual(r.map((m) => m.uid), [2]);
});

test("applyFilters: hasNote/tag/hasContacts по notesMap", () => {
  const notes = new Map([[2, { uid: 2, note: "надёжный", tags: ["vip"], contacts: [{ type: "tg", value: "@x" }] }]]);
  const list = [M({ uid: 1 }), M({ uid: 2 })];
  assert.deepEqual(applyFilters(list, { hasNote: true }, notes).map((m) => m.uid), [2]);
  assert.deepEqual(applyFilters(list, { tag: "vip" }, notes).map((m) => m.uid), [2]);
  assert.deepEqual(applyFilters(list, { hasContacts: true }, notes).map((m) => m.uid), [2]);
});

test("sortMerchants: price desc, не мутирует вход", () => {
  const input = [M({ uid: 1, minPrice: 6.5 }), M({ uid: 2, minPrice: 6.9 })];
  const r = sortMerchants(input, "price", "desc");
  assert.deepEqual(r.map((m) => m.uid), [2, 1]);
  assert.deepEqual(input.map((m) => m.uid), [1, 2]); // не мутировали
});

test("searchMerchants: по имени, uid, тегу, контакту", () => {
  const notes = new Map([[2, { uid: 2, note: "", tags: ["опт"], contacts: [{ type: "phone", value: "12345" }] }]]);
  const list = [M({ uid: 1, userName: "Alice" }), M({ uid: 2, userName: "Bob" })];
  assert.deepEqual(searchMerchants(list, "ali", notes).map((m) => m.uid), [1]);
  assert.deepEqual(searchMerchants(list, "2", notes).map((m) => m.uid), [2]);
  assert.deepEqual(searchMerchants(list, "опт", notes).map((m) => m.uid), [2]);
  assert.deepEqual(searchMerchants(list, "12345", notes).map((m) => m.uid), [2]);
  assert.deepEqual(searchMerchants(list, "", notes).map((m) => m.uid), [1, 2]); // пустой запрос — всё
});
