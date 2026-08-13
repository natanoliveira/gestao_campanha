import { can } from "@/lib/permissions";
import { describe, it, expect } from "vitest";

describe("can()", () => {
  it("ADMIN tem tudo", () => {
    expect(can("ADMIN", "org:manage")).toBe(true);
    expect(can("ADMIN", "qualquer:coisa")).toBe(true);
  });

  it("MEMBER não escreve", () => {
    expect(can("MEMBER", "project:write")).toBe(false);
    expect(can("MEMBER", "org:manage")).toBe(false);
    expect(can("MEMBER", "financial:write")).toBe(false);
  });

  it("MANAGER escreve projetos e iniciativas mas não gerencia org", () => {
    expect(can("MANAGER", "project:write")).toBe(true);
    expect(can("MANAGER", "initiative:write")).toBe(true);
    expect(can("MANAGER", "financial:write")).toBe(true);
    expect(can("MANAGER", "org:manage")).toBe(false);
  });

  it("TREASURER acessa financeiro mas não org nem projetos", () => {
    expect(can("TREASURER", "financial:write")).toBe(true);
    expect(can("TREASURER", "financial:read")).toBe(true);
    expect(can("TREASURER", "org:manage")).toBe(false);
    expect(can("TREASURER", "project:write")).toBe(false);
  });

  it("COMMUNICATION escreve timeline mas não financeiro", () => {
    expect(can("COMMUNICATION", "timeline:write")).toBe(true);
    expect(can("COMMUNICATION", "financial:write")).toBe(false);
    expect(can("COMMUNICATION", "org:manage")).toBe(false);
  });

  it("AUDITOR lê usuários e financeiro mas não escreve", () => {
    expect(can("AUDITOR", "user:read")).toBe(true);
    expect(can("AUDITOR", "financial:read")).toBe(true);
    expect(can("AUDITOR", "project:write")).toBe(false);
    expect(can("AUDITOR", "org:manage")).toBe(false);
  });

  it("role inválida retorna false", () => {
    expect(can("FANTASMA", "project:write")).toBe(false);
    expect(can("", "org:manage")).toBe(false);
    expect(can("admin", "org:manage")).toBe(false); // case-sensitive
  });

  // ponytail: trava o caso showDeleted — o vetor de risco mais alto do grafo
  it("showDeleted: só ADMIN pode ver registros deletados", () => {
    expect(can("ADMIN", "org:manage")).toBe(true);
    expect(can("MANAGER", "org:manage")).toBe(false);
    expect(can("AUDITOR", "org:manage")).toBe(false);
    expect(can("MEMBER", "org:manage")).toBe(false);
  });
});
