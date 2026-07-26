// ponytail: module-level promise serializes concurrent refresh attempts
let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = fetch("/api/v1/auth/refresh", { method: "POST" })
    .then(async (res) => {
      if (!res.ok) return null;
      const { accessToken } = await res.json();
      localStorage.setItem("access_token", accessToken);
      return accessToken as string;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("access_token") ?? "";
  const user = JSON.parse(localStorage.getItem("user") ?? "{}");
  const selectedOrgId = localStorage.getItem("selectedOrgId");

  const extraHeaders: Record<string, string> = {};
  if (user?.isMaster && selectedOrgId) {
    extraHeaders["X-Organization-Id"] = selectedOrgId;
  }

  const buildHeaders = (t: string) => ({
    ...init?.headers,
    Authorization: `Bearer ${t}`,
    ...extraHeaders,
  });

  const res = await fetch(url, { ...init, headers: buildHeaders(token) });

  if (res.status !== 401) return res;

  const newToken = await tryRefresh();

  if (!newToken) {
    window.location.replace("/session-expired");
    return res;
  }

  return fetch(url, { ...init, headers: buildHeaders(newToken) });
}
