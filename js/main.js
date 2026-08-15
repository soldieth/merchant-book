import { HTX, SUPABASE, GATE, FETCH } from "./config.js";
import { checkGate } from "./gate.js";
import { fetchMarketPage, dedupeMerchants, fetchMerchantAds, fetchMerchantInfo } from "./htx-api.js";
import { applyFilters, sortMerchants, searchMerchants } from "./filters.js";
import { getNotes, upsertNote } from "./notes-store.js";
import { renderList } from "./ui-list.js";
import { renderDetail } from "./ui-detail.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[c]));
const state = { merchants: [], notes: new Map(), side: "buy", notesError: null, allAds: [], nextPage: 1, totalPage: 1, loading: false };
const FIRST_PAGES = 3; // первая порция (≈30 объявлений)
const MORE_PAGES = 3;   // сколько догружать по кнопке

function setStatus(text, isErr = false) { const el = $("#status"); el.textContent = text; el.classList.toggle("error", isErr); }

function currentCriteria() {
  const [sortKey, dir] = $("#f-sort").value.split(":");
  return {
    criteria: {
      amount: $("#f-amount").value || null,
      payMethod: $("#f-pay").value || "",
      minLevel: $("#f-level").value ? Number($("#f-level").value) : null,
      hasNickname: $("#f-nickname").checked,
      hasTags: $("#f-tags").checked,
      hasContacts: $("#f-contacts").checked,
      tag: $("#f-tag").value.trim() || null,
    },
    sortKey, dir, query: $("#search").value,
  };
}

function rerender() {
  const { criteria, sortKey, dir, query } = currentCriteria();
  let list = applyFilters(state.merchants, criteria, state.notes);
  list = searchMerchants(list, query, state.notes);
  list = sortMerchants(list, sortKey, dir);
  renderList($("#list"), list, state.notes, openDetail, (uid) => fetchMerchantAds(uid, state.side));
  if (state.notesError) {
    setStatus(`${list.length} из ${state.merchants.length} · ⚠ ${state.notesError}`, true);
  } else {
    setStatus(`${list.length} из ${state.merchants.length} мерчантов`);
  }
}

function refreshPayOptions() {
  const set = new Set();
  state.merchants.forEach((m) => (m.payMethods || []).forEach((p) => set.add(p)));
  const sel = $("#f-pay");
  const cur = sel.value;
  sel.innerHTML = `<option value="">Все способы</option>` + [...set].sort().map((p) => `<option>${esc(p)}</option>`).join("");
  // сохраняем текущий выбор; Alipay по умолчанию — только на самой первой загрузке
  // (потом пустое значение = осознанный выбор «Все способы», не переопределяем)
  if (cur && set.has(cur)) sel.value = cur;
  else if (!state.payInit && set.has("Alipay")) sel.value = "Alipay";
  state.payInit = true;
  const tags = new Set();
  state.notes.forEach((n) => (n.tags || []).forEach((t) => tags.add(t)));
  $("#tag-list").innerHTML = [...tags].sort().map((t) => `<option value="${esc(t)}">`).join("");
}

function setMoreBtn() {
  const b = $("#more-btn");
  if (!b) return;
  const more = state.nextPage <= state.totalPage;
  b.hidden = !more;
  b.disabled = state.loading;
  b.textContent = state.loading ? "Загрузка…" : "Загрузить ещё";
}

// Полный сброс + первая порция (при загрузке/смене стороны/обновлении).
async function loadMarket() {
  state.allAds = []; state.nextPage = 1; state.totalPage = 1;
  state.merchants = []; state.notes = new Map(); state.notesError = null;
  setStatus("Загрузка стакана HTX…");
  await loadBatch(FIRST_PAGES);
}

// Догружает nPages страниц стакана, дедупит всё накопленное, подтягивает заметки для новых.
async function loadBatch(nPages) {
  if (state.loading) return;
  state.loading = true; setMoreBtn();
  try {
    for (let i = 0; i < nPages && state.nextPage <= state.totalPage; i++) {
      const r = await fetchMarketPage({ tradeType: state.side, coinId: HTX.coinId, currency: HTX.currency, page: state.nextPage, amount: $("#f-amount").value || "" });
      state.allAds.push(...r.ads);
      state.totalPage = r.totalPage;
      state.nextPage += 1;
    }
    state.merchants = dedupeMerchants(state.allAds);
    const need = state.merchants.map((m) => m.uid).filter((u) => !state.notes.has(u));
    if (need.length) {
      try { const nm = await getNotes(SUPABASE, need); nm.forEach((v, k) => state.notes.set(k, v)); state.notesError = null; }
      catch (e) { state.notesError = "заметки не загрузились: " + e.message; }
    }
    refreshPayOptions();
    rerender();
  } catch (e) {
    setStatus("Ошибка загрузки HTX: " + e.message, true);
  } finally {
    state.loading = false; setMoreBtn();
  }
}

async function openDetail(m) {
  const panel = $("#detail");
  panel.hidden = false;
  panel.innerHTML = `<div class="mut">Загрузка…</div>`;
  let ads = [], info = null;
  try { ads = await fetchMerchantAds(m.uid, state.side); } catch {}
  try { info = await fetchMerchantInfo(m.uid); } catch {}
  renderDetail(panel, { merchant: m, ads, info }, state.notes.get(m.uid), {
    onClose: () => { panel.hidden = true; },
    onSave: async (patch) => {
      const saved = await upsertNote(SUPABASE, m.uid, patch);
      state.notes.set(m.uid, saved);
      refreshPayOptions();
      rerender();
    },
  });
}

function wire() {
  ["#search", "#f-pay", "#f-level", "#f-sort", "#f-nickname", "#f-tags", "#f-contacts", "#f-tag"].forEach((sel) => {
    const el = $(sel);
    const ev = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
    let t; el.addEventListener(ev, () => { clearTimeout(t); t = setTimeout(rerender, 120); });
  });
  // Сумма сделки — серверный фильтр HTX: меняем → перезагружаем стакан (подходящие в первой порции)
  let at; $("#f-amount").addEventListener("input", () => { clearTimeout(at); at = setTimeout(loadMarket, 450); });
  $("#f-side").addEventListener("change", (e) => { state.side = e.target.value; loadMarket(); });
  $("#reload-btn").addEventListener("click", loadMarket);
  $("#more-btn").addEventListener("click", () => loadBatch(MORE_PAGES));
  const lock = $("#lock-btn");
  if (lock) lock.addEventListener("click", () => { try { localStorage.removeItem(GATE_KEY); } catch {} location.reload(); });
}

// Флаг разблокировки: храним хэш пароля, чтобы смена пароля инвалидировала сессию.
const GATE_KEY = "mb_gate";
const gateVal = () => GATE.passwordHash || "open";

async function boot() {
  const gate = $("#gate"), app = $("#app");
  const openApp = () => { gate.hidden = true; app.hidden = false; wire(); loadMarket(); };
  const enter = async () => {
    const ok = await checkGate($("#gate-input").value, GATE.passwordHash);
    if (!ok) { $("#gate-error").textContent = "Неверный пароль"; return; }
    try { localStorage.setItem(GATE_KEY, gateVal()); } catch {}
    openApp();
  };
  $("#gate-btn").addEventListener("click", enter);
  $("#gate-input").addEventListener("keydown", (e) => { if (e.key === "Enter") enter(); });
  // гейт выключен ИЛИ уже разблокировано на этом устройстве раньше → не спрашиваем
  let unlocked = !GATE.passwordHash;
  try { if (localStorage.getItem(GATE_KEY) === gateVal()) unlocked = true; } catch {}
  if (unlocked) openApp();
}

boot();
