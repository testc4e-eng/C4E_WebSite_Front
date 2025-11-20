// ==============================================
// Fichier : src/lib/api.ts
// Rôle    : Couche HTTP minimale et fiable pour le front
// Compatible avec tous les appels du Dashboard
// ==============================================

// ⚠️ Typage correct pour Vite
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Interface pour les headers avec Authorization
type CustomHeadersInit = HeadersInit & {
  Authorization?: string;
};

/**
 * Base URL de l'API : priorise VITE (build-time), sinon fallback Render.
 * ⚠️ Ne pas mettre de slash final dans VITE_API_URL.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL || "https://c4e-website-back.onrender.com";

/**
 * Concaténation sûre d'URL via URL()
 */
export const apiUrl = (path: string): string =>
  new URL(path, API_BASE_URL).toString();

/**
 * Gestion du timeout
 */
const DEFAULT_TIMEOUT_MS = 20000;
function withTimeout(signal?: AbortSignal, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abortMerge = new AbortController();

  if (signal) {
    signal.addEventListener(
      "abort",
      () => abortMerge.abort(signal.reason),
      { once: true }
    );
  }

  controller.signal.addEventListener("abort", () => abortMerge.abort(), {
    once: true,
  });

  return {
    signal: abortMerge.signal,
    cleanup: () => clearTimeout(timer),
  };
}

/**
 * Petit utilitaire: parse JSON avec sécurité.
 */
async function safeJson<T>(res: Response): Promise<T> {
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as unknown as T;
  }
  const text = await res.text();
  if (!text) return undefined as unknown as T;

  try {
    return JSON.parse(text) as T;
  } catch {
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
 * GET simple
 */
export async function httpGet<T = unknown>(
  path: string,
  token?: string | null,
  init?: RequestInit & { timeoutMs?: number }
): Promise<{ res: Response; data: T }> {
  const { timeoutMs, ...rest } = init || {};
  const { signal, cleanup } = withTimeout(rest?.signal, timeoutMs);

  try {
    const headers: Record<string, string> = {
      ...(rest?.headers as Record<string, string> || {}),
    };

    // Ajout du token si disponible
    const authToken = token || localStorage.getItem("token");
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(apiUrl(path), {
      method: "GET",
      headers,
      signal,
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
 * POST/PUT/DELETE/PATCH JSON
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
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(rest?.headers as Record<string, string> || {}),
    };

    // Ajout du token si disponible
    const authToken = token || localStorage.getItem("token");
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

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
 * CRUD ergonomique - CORRECTION DES SIGNATURES
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
 * URL fichier (CV/lettres)
 */
export const fileUrl = (filePath?: string | null): string | null => {
  if (!filePath) return null;
  if (filePath.startsWith("http")) return filePath;
  return apiUrl(filePath.startsWith("/") ? filePath : `/${filePath}`);
};

/**
 * Export par défaut : objet API complet avec interface axios-like
 */
const api = {
  API_BASE_URL,
  url: apiUrl,
  get: httpGet,
  post: postJson,
  put: putJson,
  delete: delJson,
  fileUrl,
};

export default api;