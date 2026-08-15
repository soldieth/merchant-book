// Чистые функции фильтрации/сортировки/поиска. Без DOM, без fetch.

export function applyFilters(merchants, criteria = {}, notesMap = new Map()) {
  const { minAmount, maxAmount, payMethod, onlineOnly, minLevel, hasNote, tag, hasContacts } = criteria;
  return (merchants || []).filter((m) => {
    if (onlineOnly && !m.isOnline) return false;
    if (minLevel != null && m.merchantLevel < minLevel) return false;
    if (payMethod && !(m.payMethods || []).includes(payMethod)) return false;
    // сумма: желаемый объём должен попадать в диапазон лимитов мерчанта
    if (minAmount != null && minAmount !== "" && m.maxLimit < Number(minAmount)) return false;
    if (maxAmount != null && maxAmount !== "" && m.minLimit > Number(maxAmount)) return false;
    const note = notesMap.get(m.uid);
    if (hasNote && !(note && (note.note || (note.tags && note.tags.length) || (note.contacts && note.contacts.length)))) return false;
    if (hasContacts && !(note && note.contacts && note.contacts.length)) return false;
    if (tag && !(note && (note.tags || []).includes(tag))) return false;
    return true;
  });
}

const KEY = {
  price: (m) => m.minPrice,
  tradeCount: (m) => m.tradeCount,
  orderCompleteRate: (m) => m.orderCompleteRate,
  merchantLevel: (m) => m.merchantLevel,
};

export function sortMerchants(merchants, sortKey = "tradeCount", dir = "desc") {
  const get = KEY[sortKey] || KEY.tradeCount;
  const sign = dir === "asc" ? 1 : -1;
  return [...(merchants || [])].sort((a, b) => (get(a) - get(b)) * sign);
}

export function searchMerchants(merchants, query, notesMap = new Map()) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [...(merchants || [])];
  return (merchants || []).filter((m) => {
    if (String(m.userName || "").toLowerCase().includes(q)) return true;
    if (String(m.uid).includes(q)) return true;
    const note = notesMap.get(m.uid);
    if (note) {
      if (String(note.note || "").toLowerCase().includes(q)) return true;
      if ((note.tags || []).some((t) => String(t).toLowerCase().includes(q))) return true;
      if ((note.contacts || []).some((c) => String(c.value || "").toLowerCase().includes(q) || String(c.type || "").toLowerCase().includes(q))) return true;
    }
    return false;
  });
}
