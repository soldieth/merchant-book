import { HTX } from "./config.js";

export function merchantUrl(uid) {
  // Страница трейдера на HTX (профиль + его объявления).
  return `${HTX.host}/en-us/fiat-crypto/trader/${encodeURIComponent(uid)}`;
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[c]));
const num = (n) => Math.round(Number(n) || 0).toLocaleString("ru-RU");
const price = (a, b) => (a === b ? `${a}` : `${a}–${b}`);
// компактный формат сумм: 5000→5.0K, 872638→873K, 1300000→1.3M
function kFmt(v) {
  const n = Number(v) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) { const k = n / 1e3; return (k >= 100 ? Math.round(k) : k.toFixed(1)) + "K"; }
  return String(Math.round(n));
}

// строка объявления в раскрытом аккордеоне: ЦЕНА → ОТ какой суммы (главное) + до/метод/остаток
function adLine(a) {
  const methods = (a.payMethods || []).map((p) => p.name).join(", ");
  return `<div class="ad-line"><span class="ad-price">${esc(a.price)} ¥</span><span class="ad-from">от ${kFmt(a.minTradeLimit)}</span><span class="mut">до ${kFmt(a.maxTradeLimit)} · ${esc(methods)} · ост. ${kFmt(a.tradeCount)} USDT</span></div>`;
}

// 1 мерчант = 1 строка; клик разворачивает объявления инлайн (аккордеон), ✎ — редактор заметки.
// fetchAds(uid) → Promise<ad[]>. onEdit(m) — открыть боковой редактор.
export function renderList(container, merchants, notesMap, onEdit, fetchAds) {
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
    const types = new Set((note && note.contacts || []).map((c) => c.type));
    if (types.has("Telegram")) badges.push(`<span class="badge" title="Telegram">✈️</span>`);
    if (types.has("WeChat")) badges.push(`<span class="badge" title="WeChat">💬</span>`);
    if (note && note.tags) note.tags.forEach((t) => badges.push(`<span class="badge">🏷 ${esc(t)}</span>`));

    const item = document.createElement("div");
    item.className = "mitem" + (bl ? " danger" : "");
    const row = document.createElement("div");
    row.className = "mrow";
    row.innerHTML = `
      <span class="chev">▸</span>
      <span class="m-name"><span class="dot ${m.isOnline ? "on" : "off"}"></span>${bl ? `<span class="danger-ico" title="В чёрном списке">⚠️</span>` : ""}${nameHtml}</span>
      <span class="m-stat mut">${num(m.tradeCount)} USDT · ${m.orderCompleteRate}%</span>
      <span class="m-price">${price(m.minPrice, m.maxPrice)} ¥</span>
      <span class="m-lim mut">${num(m.minLimit)}–${num(m.maxLimit)}</span>
      <span class="m-badges">${badges.join("")}</span>
      <button class="m-edit" title="Заметка / никнейм / ЧС">✎</button>`;
    const body = document.createElement("div");
    body.className = "mrow-body";
    body.hidden = true;
    item.appendChild(row);
    item.appendChild(body);
    container.appendChild(item);

    row.querySelector(".m-edit").addEventListener("click", (e) => { e.stopPropagation(); onEdit(m); });
    row.addEventListener("click", async () => {
      const opening = body.hidden;
      body.hidden = !opening;
      row.classList.toggle("open", opening);
      if (opening && !body.dataset.loaded) {
        body.innerHTML = `<div class="mut">Загрузка объявлений…</div>`;
        try {
          const ads = await fetchAds(m.uid);
          body.dataset.loaded = "1";
          body.innerHTML = ads.length ? ads.map(adLine).join("") : `<div class="mut">нет активных объявлений</div>`;
        } catch {
          body.innerHTML = `<div class="mut">не удалось загрузить объявления</div>`;
        }
      }
    });
  }
}
