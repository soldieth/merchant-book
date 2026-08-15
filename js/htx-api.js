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
