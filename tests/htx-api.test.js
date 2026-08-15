import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMarketPath, parseHtxBody } from "../js/htx-api.js";
import { dedupeMerchants } from "../js/htx-api.js";
import { fetchMarketPage, fetchAllMerchants } from "../js/htx-api.js";

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

test("dedupeMerchants: minLimit=0 — легитимный ноль не отбрасывается", () => {
  const ads = [
    AD({ minTradeLimit: "0", maxTradeLimit: "137544" }),
    AD({ minTradeLimit: "50", maxTradeLimit: "137544" }),
  ];
  const m = dedupeMerchants(ads);
  assert.equal(m[0].minLimit, 0);
  assert.equal(m[0].maxLimit, 137544);
});

function fakeFetch(pages) {
  // pages: массив тел по currPage (1-индексация)
  return async (url) => {
    const u = new URL(url);
    const page = Number(u.searchParams.get("currPage")) || 1;
    const body = pages[page - 1];
    return { ok: true, status: 200, json: async () => body };
  };
}

test("fetchMarketPage: парсит ad'ы и метаданные", async () => {
  const body = { code: 200, totalPage: 3, currPage: 1, totalCount: 25, data: [{ uid: 1, userName: "A" }] };
  const r = await fetchMarketPage({ tradeType: "buy", coinId: 2, currency: 172, page: 1 }, { fetchImpl: fakeFetch([body]) });
  assert.equal(r.totalPage, 3);
  assert.equal(r.ads.length, 1);
  assert.equal(r.ads[0].uid, 1);
});

test("fetchAllMerchants: обходит страницы и дедупит по uid", async () => {
  const mk = (uid) => ({ uid, userName: "U" + uid, price: "6.5", minTradeLimit: "100", maxTradeLimit: "200", payMethods: [] });
  const pages = [
    { code: 200, totalPage: 2, currPage: 1, data: [mk(1), mk(2)] },
    { code: 200, totalPage: 2, currPage: 2, data: [mk(2), mk(3)] },
  ];
  const merchants = await fetchAllMerchants({ tradeType: "buy", coinId: 2, currency: 172, maxPages: 20 }, { fetchImpl: fakeFetch(pages) });
  assert.deepEqual(merchants.map((m) => m.uid).sort(), [1, 2, 3]);
});

test("fetchAllMerchants: уважает maxPages", async () => {
  const mk = (uid) => ({ uid, userName: "U", price: "1", minTradeLimit: "1", maxTradeLimit: "1", payMethods: [] });
  const pages = [
    { code: 200, totalPage: 5, currPage: 1, data: [mk(1)] },
    { code: 200, totalPage: 5, currPage: 2, data: [mk(2)] },
    { code: 200, totalPage: 5, currPage: 3, data: [mk(3)] },
  ];
  const merchants = await fetchAllMerchants({ tradeType: "buy", coinId: 2, currency: 172, maxPages: 2 }, { fetchImpl: fakeFetch(pages) });
  assert.deepEqual(merchants.map((m) => m.uid).sort(), [1, 2]);
});
