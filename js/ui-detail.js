import { merchantUrl } from "./ui-list.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[c]));

const CONTACT_TYPES = ["Telegram", "WeChat"];

function contactRow(c = { type: "", value: "" }) {
  const opts = CONTACT_TYPES.map((v) => `<option${c.type === v ? " selected" : ""}>${v}</option>`).join("");
  return `<div class="crow"><select class="c-type">${opts}</select><input class="c-value" placeholder="значение" value="${esc(c.value)}" /><button class="c-del" type="button">✕</button></div>`;
}

const deposit = (info) => Math.round(Number(info && info.marginAmount) || 0).toLocaleString("ru-RU");

export function renderDetail(panel, { merchant, ads, info }, note, handlers) {
  const n = note || { note: "", tags: [], contacts: [], blacklist: false };
  panel.hidden = false;
  panel.innerHTML = `
    <button class="close" type="button">✕</button>
    <h2>${esc(merchant.userName)}</h2>
    <div class="mut">uid ${merchant.uid} · Lv${merchant.merchantLevel} · ${merchant.isOnline ? "онлайн" : "офлайн"}</div>
    <p><a href="${merchantUrl(merchant.uid)}" target="_blank" rel="noopener">Открыть на HTX ↗</a></p>
    <div class="mut">Депозит: ${deposit(info)} USDT${info ? ` · всего сделок: ${info.tradeCount ?? "—"} · релиз ~${info.releaseTime ?? "—"}с · апелляций: ${info.appealTimes ?? "—"}` : ""}</div>
    <label class="bl"><input type="checkbox" class="d-blacklist" ${n.blacklist ? "checked" : ""} /> 🚫 В чёрный список (ЧС)</label>
    <h3>Объявления (${ads.length})</h3>
    <div class="ads">${ads.map((a) => `<div class="ad"><b>${esc(a.price)} ¥</b> · лимит ${esc(a.minTradeLimit)}–${esc(a.maxTradeLimit)} · ${esc((a.payMethods||[]).map((p)=>p.name).join(", "))}</div>`).join("") || `<div class="mut">нет активных</div>`}</div>
    <h3>Заметка</h3>
    <textarea class="d-note" placeholder="свободная заметка">${esc(n.note)}</textarea>
    <h3>Теги</h3>
    <input class="d-tags" placeholder="через запятую" value="${esc((n.tags||[]).join(", "))}" />
    <h3>Контакты</h3>
    <div class="contacts">${(n.contacts && n.contacts.length ? n.contacts : [{type:"",value:""}]).map(contactRow).join("")}</div>
    <button class="c-add" type="button">+ контакт</button>
    <div style="margin-top:12px"><button class="d-save" type="button">Сохранить</button> <span class="d-status mut"></span></div>`;

  panel.querySelector(".close").onclick = handlers.onClose;
  panel.querySelector(".c-add").onclick = () => {
    const box = panel.querySelector(".contacts");
    box.insertAdjacentHTML("beforeend", contactRow());
    bindDel(panel);
  };
  bindDel(panel);
  panel.querySelector(".d-save").onclick = async () => {
    const st = panel.querySelector(".d-status");
    st.textContent = "…";
    try { await handlers.onSave({ userName: merchant.userName, ...collectDetailInput(panel) }); st.textContent = "сохранено ✓"; }
    catch (e) { st.textContent = "ошибка: " + (e.message || e); }
  };
}

function bindDel(panel) {
  panel.querySelectorAll(".c-del").forEach((b) => { b.onclick = () => { b.closest(".crow").remove(); }; });
}

export function collectDetailInput(panel) {
  const note = panel.querySelector(".d-note").value.trim();
  const tags = panel.querySelector(".d-tags").value.split(",").map((s) => s.trim()).filter(Boolean);
  const contacts = [...panel.querySelectorAll(".crow")].map((r) => ({
    type: r.querySelector(".c-type").value.trim(),
    value: r.querySelector(".c-value").value.trim(),
  })).filter((c) => c.value); // тип всегда выбран; храним строку только если вписано значение
  const blacklist = panel.querySelector(".d-blacklist").checked;
  return { note, tags, contacts, blacklist };
}
