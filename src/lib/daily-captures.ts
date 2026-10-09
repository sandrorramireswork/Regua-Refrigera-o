/**
 * Gerenciamento e persistência do histórico diário de capturas de imagem da roleta.
 * Salva as imagens lidas com sucesso, seus números reconhecidos e permite repetir o
 * processo a cada novo dia de operação.
 */

export interface SavedImageCapture {
  id: string;
  timestamp: string;      // ISO String
  date: string;           // "YYYY-MM-DD"
  displayDate: string;    // "26/09/2026 01:50"
  fileName: string;
  previewUrl: string;     // Thumbnail / Data URL
  numbers: number[];      // [32, 15, 19, 4, ...]
  count: number;
  latestNumber: number;
}

const STORAGE_KEY_CAPTURES = "roleta_capturas_diarias_v1";
const STORAGE_KEY_LAST_DATE = "roleta_ultima_data_captura";

export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDisplayDate(dateObj: Date = new Date()): string {
  const dia = String(dateObj.getDate()).padStart(2, "0");
  const mes = String(dateObj.getMonth() + 1).padStart(2, "0");
  const ano = dateObj.getFullYear();
  const hora = String(dateObj.getHours()).padStart(2, "0");
  const min = String(dateObj.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${ano} ${hora}:${min}`;
}

export function getSavedCaptures(): SavedImageCapture[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CAPTURES);
    if (!raw) return [];
    const list = JSON.parse(raw) as SavedImageCapture[];
    if (Array.isArray(list)) {
      return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }
    return [];
  } catch (err) {
    console.warn("Erro ao ler capturas salvas:", err);
    return [];
  }
}

export function saveImageCapture(data: {
  fileName: string;
  previewUrl: string;
  numbers: number[];
}): SavedImageCapture {
  const now = new Date();
  const today = getTodayDateString();
  const id = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    ? crypto.randomUUID()
    : `cap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const newCapture: SavedImageCapture = {
    id,
    timestamp: now.toISOString(),
    date: today,
    displayDate: formatDisplayDate(now),
    fileName: data.fileName || `captura-${today}.png`,
    previewUrl: data.previewUrl,
    numbers: data.numbers,
    count: data.numbers.length,
    latestNumber: data.numbers[0] ?? 0,
  };

  try {
    const existing = getSavedCaptures();
    // Limita o histórico das últimas 30 capturas para poupar storage
    const updated = [newCapture, ...existing.filter((c) => c.id !== id)].slice(0, 30);
    localStorage.setItem(STORAGE_KEY_CAPTURES, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEY_LAST_DATE, today);
  } catch (err) {
    console.warn("Erro ao salvar captura no localStorage (tentando sem imagem pesada):", err);
    try {
      // Se estourar limite de tamanho, salva sem a dataUrl completa
      const lightweight = { ...newCapture, previewUrl: "" };
      const existing = getSavedCaptures().map((c) => ({ ...c, previewUrl: "" }));
      localStorage.setItem(STORAGE_KEY_CAPTURES, JSON.stringify([lightweight, ...existing].slice(0, 30)));
      localStorage.setItem(STORAGE_KEY_LAST_DATE, today);
    } catch {}
  }

  return newCapture;
}

export function deleteSavedCapture(id: string): SavedImageCapture[] {
  try {
    const existing = getSavedCaptures();
    const filtered = existing.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEY_CAPTURES, JSON.stringify(filtered));
    return filtered;
  } catch {
    return [];
  }
}

export function clearAllSavedCaptures(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CAPTURES);
    localStorage.removeItem(STORAGE_KEY_LAST_DATE);
  } catch {}
}

export function isNewDaySession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const lastDate = localStorage.getItem(STORAGE_KEY_LAST_DATE);
    if (!lastDate) return false;
    return lastDate !== getTodayDateString();
  } catch {
    return false;
  }
}
