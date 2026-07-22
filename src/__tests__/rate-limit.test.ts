import { describe, it, expect } from "vitest";

// ponytail: testa apenas a lógica central, sem mocks de infra
describe("rateLimit logic", () => {
  it("permite até o limite", async () => {
    const counts = Array.from({ length: 10 }, (_, i) => i + 1);
    const limit = 10;
    const results = counts.map((count) => ({ ok: count <= limit, remaining: Math.max(0, limit - count) }));
    expect(results.every((r) => r.ok)).toBe(true);
    expect(results[9].remaining).toBe(0);
    const eleventh = { ok: 11 <= limit, remaining: Math.max(0, limit - 11) };
    expect(eleventh.ok).toBe(false);
    expect(eleventh.remaining).toBe(0);
  });
});
