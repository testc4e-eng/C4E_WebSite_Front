export const postJson = <T = unknown>(
  path: string,
  body?: unknown,
  init?: RequestInit & { timeoutMs?: number }
) =>
  fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    ...init,
  }).then(async res => {
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<T>;
  });
