const IDLE_MS = 30 * 60 * 1000; // 30min

export function touchActivity() {
  if (typeof window !== "undefined") localStorage.setItem("lastActivity", String(Date.now()));
}

function isIdle(): boolean {
  const last = Number(localStorage.getItem("lastActivity") ?? 0);
  return last > 0 && Date.now() - last > IDLE_MS;
}

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
  if (isIdle()) {
    window.location.replace("/session-expired");
    return new Response(null, { status: 401 });
  }

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

  if (res.status !== 401) {
    touchActivity();
    return res;
  }

  const newToken = await tryRefresh();

  if (!newToken) {
    window.location.replace("/session-expired");
    return res;
  }

  return fetch(url, { ...init, headers: buildHeaders(newToken) });
}
