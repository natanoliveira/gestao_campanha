type Role = "ADMIN" | "MANAGER" | "TREASURER" | "COMMUNICATION" | "AUDITOR" | "MEMBER";

const PERMISSIONS: Record<Role, readonly string[]> = {
  ADMIN:         ["*"],
  MANAGER:       ["project:write", "initiative:write", "financial:write", "timeline:write", "user:read", "category:write"],
  TREASURER:     ["financial:write", "financial:read", "project:read", "initiative:read"],
  COMMUNICATION: ["timeline:write", "project:read", "initiative:read"],
  AUDITOR:       ["financial:read", "project:read", "initiative:read", "user:read"],
  MEMBER:        ["project:read", "initiative:read", "timeline:read"],
};

export function can(role: string, permission: string): boolean {
  const perms = PERMISSIONS[role as Role] ?? [];
  return perms.includes("*") || perms.includes(permission);
}
