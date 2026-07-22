export async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("access_token") ?? "";
  const user = JSON.parse(localStorage.getItem("user") ?? "{}");
  const selectedOrgId = localStorage.getItem("selectedOrgId");

  const extraHeaders: Record<string, string> = {};
  if (user?.isMaster && selectedOrgId) {
    extraHeaders["X-Organization-Id"] = selectedOrgId;
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
      ...extraHeaders,
    },
  });

  if (res.status === 401) {
    const data = await res.clone().json().catch(() => ({}));
    if (res.status === 401 || data?.code === "UNAUTHORIZED") {
      window.location.replace("/session-expired");
    }
  }

  return res;
}
