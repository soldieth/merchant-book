// Слой HTX public API. Чистые функции (пути/парсинг/дедуп) + fetch-обёртки.
// CORS у htx.com открыт (отражает Origin) — обычный fetch из браузера работает.

const API = "/-/x/otc/v1";

export function buildMarketPath({ tradeType = "buy", coinId, currency, online = 1, amount = "", payMethod = "", page = 1 }) {
  const qs = new URLSearchParams({
    coinId: String(coinId),
    currency: String(currency),
    tradeType,
    currPage: String(page),
    payMethod: String(payMethod ?? ""),
    acceptOrder: "-1",
    country: "",
    blockType: "general",
    online: String(online),
    range: "0",
    amount: String(amount ?? ""),
    isThumbsUp: "false",
    isMerchant: "false",
    isTraded: "false",
  });
  return `${API}/data/trade-market?${qs.toString()}`;
}

export function parseHtxBody(json) {
  if (!json || json.success === false || (json.code != null && json.code !== 200)) {
    const msg = (json && (json.message || json.code)) || "HTX API error";
    throw new Error(String(msg));
  }
  return json;
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

export function dedupeMerchants(ads) {
  const byUid = new Map();
  for (const ad of ads || []) {
    if (ad?.uid == null) continue;
    const price = num(ad.price);
    const minL = num(ad.minTradeLimit);
    const maxL = num(ad.maxTradeLimit);
    const methods = (ad.payMethods || []).map((p) => p?.name).filter(Boolean);
    let m = byUid.get(ad.uid);
    if (!m) {
      m = {
        uid: ad.uid,
        userName: String(ad.userName || "").trim(),
        merchantLevel: num(ad.merchantLevel),
        isOnline: !!ad.isOnline,
        tradeCount: num(ad.tradeCount),
        tradeMonthTimes: num(ad.tradeMonthTimes),
        orderCompleteRate: num(ad.orderCompleteRate),
        minPrice: price, maxPrice: price,
        minLimit: minL, maxLimit: maxL,
        payMethods: new Set(methods),
        adCount: 0,
      };
      byUid.set(ad.uid, m);
    }
    m.adCount += 1;
    m.merchantLevel = Math.max(m.merchantLevel, num(ad.merchantLevel));
    m.isOnline = m.isOnline || !!ad.isOnline;
    if (price > 0) { m.minPrice = Math.min(m.minPrice || price, price); m.maxPrice = Math.max(m.maxPrice, price); }
    m.minLimit = Math.min(m.minLimit || minL, minL);
    m.maxLimit = Math.max(m.maxLimit, maxL);
    methods.forEach((x) => m.payMethods.add(x));
  }
  return [...byUid.values()].map((m) => ({ ...m, payMethods: [...m.payMethods] }));
}
