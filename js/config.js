// ЕДИНСТВЕННЫЙ файл для правки пользователем. Вставь свои значения Supabase.
export const HTX = {
  host: "https://www.htx.com",
  coinId: 2,       // USDT
  currency: 172,   // CNY
  tradeType: "buy",
};

// Supabase → Project Settings → API: Project URL и anon public key.
export const SUPABASE = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR-ANON-KEY",
  table: "merchant_notes",
};

// Пароль-гейт: SHA-256 (hex) от пароля. null = выключить гейт.
// Сгенерировать хэш: см. README (одна строка в консоли браузера).
export const GATE = { passwordHash: null };

export const FETCH = { maxPages: 20 }; // страниц стакана за загрузку (10 ad'ов/стр)
