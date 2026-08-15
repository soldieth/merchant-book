import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMarketPath, parseHtxBody } from "../js/htx-api.js";

test("buildMarketPath: базовые параметры и дефолты", () => {
  const p = buildMarketPath({ tradeType: "buy", coinId: 2, currency: 172, page: 1 });
  assert.ok(p.startsWith("/-/x/otc/v1/data/trade-market?"));
  assert.match(p, /coinId=2/);
  assert.match(p, /currency=172/);
  assert.match(p, /tradeType=buy/);
  assert.match(p, /currPage=1/);
  assert.match(p, /blockType=general/);
});

test("buildMarketPath: online по умолчанию 1, amount опускается если пусто", () => {
  const p = buildMarketPath({ tradeType: "buy", coinId: 2, currency: 172, page: 2 });
  assert.match(p, /online=1/);
  assert.match(p, /amount=(&|$)/); // пустой amount
});

test("parseHtxBody: успех возвращает тело", () => {
  const body = { code: 200, success: true, data: [{ uid: 1 }] };
  assert.deepEqual(parseHtxBody(body), body);
});

test("parseHtxBody: success:false бросает", () => {
  assert.throws(() => parseHtxBody({ success: false, message: "nope" }), /nope/);
});

test("parseHtxBody: code!=200 бросает", () => {
  assert.throws(() => parseHtxBody({ code: 500, message: "err" }), /err|500/);
});
