// ==============================================
// Fichier : src/lib/api.ts
// Rôle    : Couche HTTP minimale et fiable pour le front
// Note    : Compatible avec les appels attendus par Dashboard.tsx
// ==============================================

/**
 * Base URL de l'API : priorise Vite (build-time), sinon fallback Render.
 * ⚠️ Ne pas mettre de slash final dans VITE_API_URL.
 */
export const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_URL || "https://c4e-website-back.onrender.com";

/**
 * Concaténation sûre d’URL via URL()
 * Exemples:
 *   apiUrl("/api/offres") -> "https://.../api/offres"
 *   apiUrl("uploads/cv.pdf") -> "https://.../uploads/cv.pdf"
 */
export const apiUrl = (path: string): string => new URL(path, API_BASE_URL).toString();

/**
 * Options par défaut : timeout, etc.
 */
const DEFAULT_TIMEOUT_MS = 20000;

/**
 * Petit utilitaire: parse JSON avec sécurité.
 */
async function safeJson<T>(res: Response): Promise<T> {
  // Pas de contenu
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as unknown as T;
  }
  const text = await res.text();
  if (!text) return undefined as unknown as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    // Renvoie le texte brut si ce n’est pas du JSON
    return text as unknown as T;
  }
}

/**
 * Vérifie ok et jette une erreur claire sinon.
 */
function assertOk(res: Response, context?: string) {
  if (!res.ok) {
    const msg = `${context || "Requête échouée"} (HTTP ${res.status})`;
    const err = new Error(msg) as Error & { status?: number; url?: string };
    err.status = res.status;
    err.url = res.url;
    throw err;
  }
}

/**
 * AbortController avec timeout.
 */
function withTimeout(signal?: AbortSignal, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abortMerge = new AbortController();

  // Si un signal externe est fourni : chaîner
  if (signal) {
    signal.addEventListener("abort", () => abortMerge.abort(signal.reason), { once: true });
  }
  controller.signal.addEventListener("abort", () => abortMerge.abort(), { once: true });

  return {
    signal: abortMerge.signal,
    cleanup: () => clearTimeout(timer),
  };
}

/**
 * GET simple.
 * - N’ajoute pas Content-Type pour éviter toute ambiguïté
 * - Authorization si token fourni
 */
export async function httpGet<T = unknown>(
  path: string,
  token?: string | null,
  init?: RequestInit & { timeoutMs?: number }
): Promise<{ res: Response; data: T }> {
  const { timeoutMs, ...rest } = init || {};
  const { signal, cleanup } = withTimeout(rest?.signal, timeoutMs);

  try {
    const res = await fetch(apiUrl(path), {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal,
      // mode, credentials: par défaut suffisent
      ...rest,
    });
    assertOk(res, `GET ${path}`);
    const data = await safeJson<T>(res);
    return { res, data };
  } finally {
    cleanup();
  }
}

/**
 * Appels JSON : POST / PUT / DELETE / PATCH
 */
export async function httpJson<T = unknown>(
  path: string,
  method: "POST" | "PUT" | "DELETE" | "PATCH",
  token?: string | null,
  body?: unknown,
  init?: RequestInit & { timeoutMs?: number }
): Promise<{ res: Response; data: T }> {
  const { timeoutMs, ...rest } = init || {};
  const { signal, cleanup } = withTimeout(rest?.signal, timeoutMs);

  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest?.headers || {}),
    };

    const res = await fetch(apiUrl(path), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      ...rest,
    });
    assertOk(res, `${method} ${path}`);
    const data = await safeJson<T>(res);
    return { res, data };
  } finally {
    cleanup();
  }
}

/**
 * Helpers CRUD ergonomiques si tu préfères api.post/put/del
 */
export const postJson = <T = unknown>(
  path: string,
  token?: string | null,
  body?: unknown,
  init?: RequestInit & { timeoutMs?: number }
) => httpJson<T>(path, "POST", token, body, init);

export const putJson = <T = unknown>(
  path: string,
  token?: string | null,
  body?: unknown,
  init?: RequestInit & { timeoutMs?: number }
) => httpJson<T>(path, "PUT", token, body, init);

export const delJson = <T = unknown>(
  path: string,
  token?: string | null,
  body?: unknown,
  init?: RequestInit & { timeoutMs?: number }
) => httpJson<T>(path, "DELETE", token, body, init);

/**
 * URL fichier (CV/lettres) : accepte chemin relatif ou absolu.
 */
export const fileUrl = (filePath?: string | null): string | null => {
  if (!filePath) return null;
  if (filePath.startsWith("http")) return filePath;
  return apiUrl(filePath.startsWith("/") ? filePath : `/${filePath}`);
};

/**
 * Export par défaut sous forme d’objet, pratique pour
 *   import api from "../lib/api"
 */
const api = {
  API_BASE_URL,
  url: apiUrl,
  get: httpGet,
  json: httpJson,
  post: postJson,
  put: putJson,
  delete: delJson,
  fileUrl,
};

export default api;
