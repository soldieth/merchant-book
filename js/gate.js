// Простой клиентский пароль-гейт (SHA-256). Не крипто-защита данных, а отсев случайных.
export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function checkGate(input, hash) {
  if (!hash) return true; // гейт выключен
  return (await sha256Hex(String(input || ""))) === String(hash).toLowerCase();
}
