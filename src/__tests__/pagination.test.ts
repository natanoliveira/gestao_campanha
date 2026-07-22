import { describe, it, expect } from "vitest";
import { paginatedResponse } from "@/lib/pagination";

describe("paginatedResponse", () => {
  it("calcula totalPages corretamente", () => {
    const result = paginatedResponse([1, 2, 3], 10, 1, 3);
    expect(result.meta.totalPages).toBe(4);
    expect(result.meta.total).toBe(10);
    expect(result.data).toHaveLength(3);
  });

  it("totalPages mínimo 1", () => {
    const result = paginatedResponse([], 0, 1, 10);
    expect(result.meta.totalPages).toBe(0);
  });
});
