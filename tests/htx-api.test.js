import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMarketPath, parseHtxBody } from "../js/htx-api.js";
import { dedupeMerchants } from "../js/htx-api.js";

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

const AD = (o) => ({
  uid: 1, userName: "A", merchantLevel: 2, isOnline: true,
  tradeCount: "100.5", tradeMonthTimes: 50, orderCompleteRate: "97",
  price: "6.68", minTradeLimit: "40000.00", maxTradeLimit: "137544.00",
  payMethods: [{ payMethodId: 3, name: "WeChat" }], ...o,
});

test("dedupeMerchants: два ad'а одного uid → один мерчант с агрегатом", () => {
  const ads = [
    AD({ price: "6.68", minTradeLimit: "40000", maxTradeLimit: "137544", payMethods: [{ name: "WeChat" }] }),
    AD({ price: "6.70", minTradeLimit: "1000", maxTradeLimit: "200000", payMethods: [{ name: "Alipay" }] }),
  ];
  const m = dedupeMerchants(ads);
  assert.equal(m.length, 1);
  assert.equal(m[0].uid, 1);
  assert.equal(m[0].adCount, 2);
  assert.equal(m[0].minPrice, 6.68);
  assert.equal(m[0].maxPrice, 6.70);
  assert.equal(m[0].minLimit, 1000);
  assert.equal(m[0].maxLimit, 200000);
  assert.deepEqual([...m[0].payMethods].sort(), ["Alipay", "WeChat"]);
});

test("dedupeMerchants: разные uid → разные мерчанты", () => {
  const m = dedupeMerchants([AD({ uid: 1 }), AD({ uid: 2, userName: "B" })]);
  assert.equal(m.length, 2);
});

test("dedupeMerchants: orderCompleteRate и tradeCount числа", () => {
  const m = dedupeMerchants([AD({ orderCompleteRate: "97", tradeCount: "100.5" })]);
  assert.equal(m[0].orderCompleteRate, 97);
  assert.equal(m[0].tradeCount, 100.5);
});
