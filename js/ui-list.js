import { HTX } from "./config.js";

export function merchantUrl(uid) {
  // Страница трейдера на HTX (профиль + его объявления).
  return `${HTX.host}/en-us/fiat-crypto/trader/${encodeURIComponent(uid)}`;
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[c]));
const num = (n) => Math.round(Number(n) || 0).toLocaleString("ru-RU");
const price = (a, b) => (a === b ? `${a}` : `${a}–${b}`);

// 1 мерчант = 1 строка (не плитки).
export function renderList(container, merchants, notesMap, onOpen) {
  container.innerHTML = "";
  if (!merchants.length) { container.innerHTML = `<div class="mut">Ничего не найдено</div>`; return; }
  for (const m of merchants) {
    const note = notesMap.get(m.uid);
    const bl = !!(note && note.blacklist);
    const nick = note && note.nickname ? esc(note.nickname) : "";
    const nameHtml = nick
      ? `<b>${nick}</b> <span class="real mut">${esc(m.userName)}</span>`
      : esc(m.userName);
    const badges = [];
    if (note && note.note) badges.push(`<span class="badge">📝</span>`);
    if (note && note.contacts && note.contacts.length) badges.push(`<span class="badge">📞 ${note.contacts.length}</span>`);
    if (note && note.tags) note.tags.forEach((t) => badges.push(`<span class="badge">🏷 ${esc(t)}</span>`));
    const el = document.createElement("div");
    el.className = "mrow" + (bl ? " danger" : "");
    el.innerHTML = `
      <span class="m-name"><span class="dot ${m.isOnline ? "on" : "off"}"></span>${bl ? `<span class="danger-ico" title="В чёрном списке">⚠️</span>` : ""}${nameHtml}</span>
      <span class="m-lv mut">Lv${m.merchantLevel}</span>
      <span class="m-stat mut">${num(m.tradeCount)} сд · ${m.orderCompleteRate}%</span>
      <span class="m-price">${price(m.minPrice, m.maxPrice)} ¥</span>
      <span class="m-lim mut">${num(m.minLimit)}–${num(m.maxLimit)}</span>
      <span class="m-pay mut">${esc((m.payMethods || []).join(", "))}</span>
      <span class="m-badges">${badges.join("")}</span>`;
    el.addEventListener("click", () => onOpen(m));
    container.appendChild(el);
  }
}
