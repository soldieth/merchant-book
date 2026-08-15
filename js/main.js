import { HTX, SUPABASE, GATE, FETCH } from "./config.js";
import { checkGate } from "./gate.js";
import { fetchAllMerchants, fetchMerchantAds, fetchMerchantInfo } from "./htx-api.js";
import { applyFilters, sortMerchants, searchMerchants } from "./filters.js";
import { getNotes, upsertNote } from "./notes-store.js";
import { renderList } from "./ui-list.js";
import { renderDetail } from "./ui-detail.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[c]));
const state = { merchants: [], notes: new Map(), side: "buy", notesError: null };

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
  renderList($("#list"), list, state.notes, openDetail);
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
  if (cur && set.has(cur)) sel.value = cur;
  const tags = new Set();
  state.notes.forEach((n) => (n.tags || []).forEach((t) => tags.add(t)));
  $("#tag-list").innerHTML = [...tags].sort().map((t) => `<option value="${esc(t)}">`).join("");
}

async function loadMarket() {
  setStatus("Загрузка стакана HTX…");
  try {
    state.merchants = await fetchAllMerchants({ tradeType: state.side, coinId: HTX.coinId, currency: HTX.currency, maxPages: FETCH.maxPages });
    try {
      state.notes = await getNotes(SUPABASE, state.merchants.map((m) => m.uid));
      state.notesError = null;
    } catch (e) { state.notesError = "заметки не загрузились: " + e.message; }
    refreshPayOptions();
    rerender();
  } catch (e) {
    setStatus("Ошибка загрузки HTX: " + e.message, true);
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
  ["#search", "#f-amount", "#f-pay", "#f-level", "#f-sort", "#f-nickname", "#f-tags", "#f-contacts", "#f-tag"].forEach((sel) => {
    const el = $(sel);
    const ev = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
    let t; el.addEventListener(ev, () => { clearTimeout(t); t = setTimeout(rerender, 120); });
  });
  $("#f-side").addEventListener("change", (e) => { state.side = e.target.value; loadMarket(); });
  $("#reload-btn").addEventListener("click", loadMarket);
}

async function boot() {
  const gate = $("#gate"), app = $("#app");
  const enter = async () => {
    const ok = await checkGate($("#gate-input").value, GATE.passwordHash);
    if (!ok) { $("#gate-error").textContent = "Неверный пароль"; return; }
    gate.hidden = true; app.hidden = false;
    wire(); await loadMarket();
  };
  $("#gate-btn").addEventListener("click", enter);
  $("#gate-input").addEventListener("keydown", (e) => { if (e.key === "Enter") enter(); });
  if (!GATE.passwordHash) { gate.hidden = true; app.hidden = false; wire(); await loadMarket(); }
}

boot();
