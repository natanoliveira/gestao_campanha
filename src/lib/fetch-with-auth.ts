export async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("access_token") ?? "";

  const res = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
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
