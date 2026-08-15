# Merchant Book

Статический сайт: мерчанты HTX P2P (CNY) с фильтрами/поиском + наши заметки, теги и контакты
с синком через Supabase. Хостинг — GitHub Pages. Без бэкенда и сборки.

## Настройка (5 минут)

### 1. Supabase
1. Создай проект на https://supabase.com (free).
2. SQL Editor → вставь `supabase-setup.sql` → Run (создаёт таблицу + RLS).
3. Project Settings → API → скопируй **Project URL** и **anon public key**.

### 2. config.js
Открой `js/config.js`, впиши:
```js
export const SUPABASE = { url: "https://ТВОЙ.supabase.co", anonKey: "ТВОЙ-ANON-KEY", table: "merchant_notes" };
```

### 3. Пароль (опционально)
Чтобы закрыть сайт паролем — сгенерируй SHA-256 хэш в консоли браузера (F12):
```js
crypto.subtle.digest("SHA-256", new TextEncoder().encode("ТВОЙ-ПАРОЛЬ"))
  .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")))
```
Вставь результат в `js/config.js`: `export const GATE = { passwordHash: "..." };`
(оставь `null` — без пароля).

## Локальный запуск
ES-модули требуют http (не `file://`):
```bash
python -m http.server 8080   # → http://localhost:8080
```

## Деплой на GitHub Pages
1. Запушь репу на GitHub.
2. Settings → Pages → Source: ветка `main`, папка `/ (root)` → Save.
3. Через ~1 мин сайт на `https://<аккаунт>.github.io/<репо>/`.

## Тесты
```bash
npm test   # node --test: htx-api, filters, notes-store
```

## Что где
- `js/htx-api.js` — публичный HTX API (список/объявления/профиль), дедуп по uid.
- `js/filters.js` — фильтры/сортировка/поиск (чистые).
- `js/notes-store.js` — Supabase REST (заметки/контакты).
- `js/ui-*.js` — рендер. `js/main.js` — сборка. `js/config.js` — твои ключи.
