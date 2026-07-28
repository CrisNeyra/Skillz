const browserBase = "/api/proxy";
const serverBase = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type FetchOptions = RequestInit & { token?: string | null };

async function request<T>(
  base: string,
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const isForm = typeof FormData !== "undefined" && rest.body instanceof FormData;
  const res = await fetch(`${base}${path}`, {
    ...rest,
    credentials: base.startsWith("/") ? "include" : rest.credentials,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token && token !== "cookie" ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = "Error de API";
    try {
      const body = await res.json();
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body.detail)) {
        detail = body.detail
          .map((item: { msg?: string; loc?: unknown[] }) => item.msg ?? JSON.stringify(item))
          .join(". ");
      } else if (body.detail != null) {
        detail = JSON.stringify(body.detail);
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function apiServer<T>(path: string, options?: FetchOptions) {
  return request<T>(serverBase.replace(/\/$/, ""), path, options);
}

export function apiClient<T>(path: string, options?: FetchOptions) {
  return request<T>(browserBase, path, options);
}

export { browserBase as API_PUBLIC_URL };
