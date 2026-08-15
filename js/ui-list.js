import { HTX } from "./config.js";

export function merchantUrl(uid) {
  // Профиль/объявления мерчанта на HTX (страница трейдера).
  return `${HTX.host}/en-us/fiat-crypto/trade/merchant/${encodeURIComponent(uid)}`;
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[c]));

export function renderList(container, merchants, notesMap, onOpen) {
  container.innerHTML = "";
  if (!merchants.length) { container.innerHTML = `<div class="mut">Ничего не найдено</div>`; return; }
  for (const m of merchants) {
    const note = notesMap.get(m.uid);
    const badges = [];
    if (note && note.note) badges.push(`<span class="badge">📝 заметка</span>`);
    if (note && note.contacts && note.contacts.length) badges.push(`<span class="badge">📞 ${note.contacts.length}</span>`);
    if (note && note.tags) note.tags.forEach((t) => badges.push(`<span class="badge">🏷 ${esc(t)}</span>`));
    const el = document.createElement("div");
    el.className = "mcard";
    el.innerHTML = `
      <div class="row"><span class="name"><span class="dot ${m.isOnline ? "on" : "off"}"></span> ${esc(m.userName)}</span><span class="mut">Lv${m.merchantLevel}</span></div>
      <div class="row mut"><span>${m.tradeCount} сделок · ${m.orderCompleteRate}%</span><span>${m.minPrice}–${m.maxPrice} ¥</span></div>
      <div class="row mut"><span>Лимит ${m.minLimit}–${m.maxLimit}</span><span>${esc((m.payMethods||[]).join(", "))}</span></div>
      <div class="badges">${badges.join("")}</div>`;
    el.addEventListener("click", () => onOpen(m));
    container.appendChild(el);
  }
}
